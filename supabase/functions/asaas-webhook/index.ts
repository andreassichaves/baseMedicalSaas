/**
 * Webhook Asaas → Supabase Edge Function (sem billing-service Node).
 * URL publica: https://<PROJECT_REF>.supabase.co/functions/v1/asaas-webhook
 *
 * Secrets (Dashboard > Edge Functions > Secrets ou `supabase secrets set`):
 * - ASAAS_WEBHOOK_TOKEN (obrigatorio; mesmo valor do painel Asaas)
 *
 * SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetados automaticamente no deploy.
 *
 * Lista de eventos habilitados no painel Asaas + o que tem logica de dominio vs auditoria:
 * DEVELOPMENT_PLAN.md → secao "Eventos habilitados no Asaas (documentacao da conta)".
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type BillingDomainEvent =
  | {
      type: "subscription_created";
      externalCustomerId: string;
      externalSubscriptionId: string;
      status: string;
    }
  | {
      type: "payment_succeeded";
      externalCustomerId: string;
      externalPaymentId: string;
      amountCents: number;
      currency: string;
      paidAtIso?: string;
    }
  | { type: "payment_failed"; externalCustomerId: string }
  | {
      type: "subscription_canceled";
      externalCustomerId: string;
      externalSubscriptionId?: string;
    }
  | {
      type: "payment_refunded";
      externalCustomerId: string;
      externalPaymentId: string;
    };

function verifyAsaasToken(req: Request): boolean {
  const token =
    req.headers.get("asaas-access-token") ??
    req.headers.get("Asaas-Access-Token");
  const expected = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  if (!expected || !token) return false;
  return token === expected;
}

function customerIdFromPayment(payment: Record<string, unknown>): string {
  const c = payment.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) {
    return String((c as { id: string }).id);
  }
  return "";
}

function parseAsaasWebhookPayload(body: Record<string, unknown>): {
  events: BillingDomainEvent[];
  eventType: string;
  eventId: string;
} {
  const eventType = String(body.event ?? body.Event ?? "unknown");
  const payment = body.payment as Record<string, unknown> | undefined;
  const subscription = body.subscription as Record<string, unknown> | undefined;

  const eventId = String(
    payment?.id ?? subscription?.id ?? body.id ?? `asaas_${Date.now()}`
  );

  const events: BillingDomainEvent[] = [];

  switch (eventType) {
    case "PAYMENT_RECEIVED":
    case "PAYMENT_CONFIRMED": {
      if (payment) {
        const externalCustomerId = customerIdFromPayment(payment);
        const value = Number(payment.value ?? 0);
        const amountCents = Math.round(value * 100);
        events.push({
          type: "payment_succeeded",
          externalCustomerId,
          externalPaymentId: String(payment.id ?? eventId),
          amountCents,
          currency: "BRL",
          paidAtIso:
            (payment.confirmedDate as string) ??
            (payment.dateCreated as string) ??
            undefined,
        });
      }
      break;
    }
    case "PAYMENT_OVERDUE": {
      if (payment) {
        events.push({
          type: "payment_failed",
          externalCustomerId: customerIdFromPayment(payment),
        });
      }
      break;
    }
    case "PAYMENT_REFUNDED": {
      if (payment) {
        events.push({
          type: "payment_refunded",
          externalCustomerId: customerIdFromPayment(payment),
          externalPaymentId: String(payment.id ?? ""),
        });
      }
      break;
    }
    case "SUBSCRIPTION_CREATED": {
      if (subscription) {
        const cust =
          typeof subscription.customer === "string"
            ? subscription.customer
            : String((subscription.customer as { id?: string })?.id ?? "");
        events.push({
          type: "subscription_created",
          externalCustomerId: cust,
          externalSubscriptionId: String(subscription.id ?? ""),
          status: String(subscription.status ?? "active"),
        });
      }
      break;
    }
    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED": {
      if (subscription) {
        const cust =
          typeof subscription.customer === "string"
            ? subscription.customer
            : String((subscription.customer as { id?: string })?.id ?? "");
        events.push({
          type: "subscription_canceled",
          externalCustomerId: cust,
          externalSubscriptionId: subscription.id
            ? String(subscription.id)
            : undefined,
        });
      }
      break;
    }
    default:
      break;
  }

  return { events, eventType, eventId };
}

async function findOrgIdByExternalCustomerId(
  db: SupabaseClient,
  externalCustomerId: string
): Promise<string | null> {
  const { data } = await db
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", externalCustomerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function applyDomainEvents(
  db: SupabaseClient,
  events: BillingDomainEvent[]
): Promise<void> {
  for (const event of events) {
    switch (event.type) {
      case "subscription_created": {
        const orgId = await findOrgIdByExternalCustomerId(
          db,
          event.externalCustomerId
        );
        if (orgId) {
          await db.from("subscriptions").upsert(
            {
              org_id: orgId,
              stripe_subscription_id: event.externalSubscriptionId,
              status: event.status,
              plan: "pro",
            },
            { onConflict: "stripe_subscription_id" }
          );
        }
        break;
      }
      case "payment_succeeded": {
        const orgId = await findOrgIdByExternalCustomerId(
          db,
          event.externalCustomerId
        );
        if (orgId) {
          await db
            .from("organizations")
            .update({ subscription_status: "active" })
            .eq("id", orgId);
          await db.from("invoices").upsert(
            {
              org_id: orgId,
              stripe_invoice_id: event.externalPaymentId,
              amount_cents: event.amountCents,
              currency: event.currency.toLowerCase(),
              status: "paid",
              period_start: event.paidAtIso ?? new Date().toISOString(),
              period_end: event.paidAtIso ?? new Date().toISOString(),
            },
            { onConflict: "stripe_invoice_id" }
          );
          await db
            .from("subscriptions")
            .update({ status: "active" })
            .eq("org_id", orgId)
            .in("status", ["pending", "past_due"]);
        }
        break;
      }
      case "payment_failed": {
        await db
          .from("organizations")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", event.externalCustomerId);
        break;
      }
      case "subscription_canceled": {
        await db
          .from("organizations")
          .update({ subscription_status: "canceled", plan: "free" })
          .eq("stripe_customer_id", event.externalCustomerId);
        if (event.externalSubscriptionId) {
          await db
            .from("subscriptions")
            .update({
              status: "canceled",
              canceled_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", event.externalSubscriptionId);
        }
        break;
      }
      case "payment_refunded": {
        const orgId = await findOrgIdByExternalCustomerId(
          db,
          event.externalCustomerId
        );
        if (orgId) {
          await db
            .from("invoices")
            .update({ status: "refunded" })
            .eq("org_id", orgId)
            .eq("stripe_invoice_id", event.externalPaymentId);
        }
        break;
      }
    }
  }
}

function firstCustomerId(events: BillingDomainEvent[]): string | null {
  for (const e of events) {
    if ("externalCustomerId" in e && e.externalCustomerId) {
      return e.externalCustomerId;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!verifyAsaasToken(req)) {
    return new Response("Invalid webhook token", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Server misconfigured", { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceKey);
  const { events, eventType, eventId } = parseAsaasWebhookPayload(body);

  try {
    if (events.length > 0) {
      await applyDomainEvents(db, events);
    }

    const customerId = firstCustomerId(events);
    const orgId = customerId
      ? await findOrgIdByExternalCustomerId(db, customerId)
      : null;

    const suffix = crypto.randomUUID().slice(0, 8);
    await db.from("payment_events").insert({
      org_id: orgId,
      stripe_event_id: `asaas_${eventId}_${suffix}`,
      event_type: eventType,
      payload: body as unknown as Record<string, unknown>,
    });

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Asaas webhook error:", e);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
