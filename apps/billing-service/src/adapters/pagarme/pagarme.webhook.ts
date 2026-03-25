import crypto from "node:crypto";
import type { BillingDomainEvent } from "../../domain/billing-events";

export function verifyPagarmeSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expected = crypto
    .createHmac("sha1", secret)
    .update(rawBody)
    .digest("hex");

  return `sha1=${expected}` === signatureHeader;
}

function customerIdFromCharge(charge: Record<string, unknown>): string {
  const c = charge.customer;
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && "id" in c) {
    return String((c as { id: string }).id);
  }
  return "";
}

export function parsePagarmeWebhookPayload(body: Record<string, unknown>): {
  events: BillingDomainEvent[];
  eventType: string;
  eventId: string;
} {
  const eventType = String(body.type ?? "unknown");
  const eventId = String(body.id ?? `pagarme_${Date.now()}`);
  const data = body.data as Record<string, unknown> | undefined;

  const events: BillingDomainEvent[] = [];

  switch (eventType) {
    case "subscription.created": {
      const subscription = data ?? {};
      let customerId = "";
      if (typeof subscription.customer === "string") {
        customerId = subscription.customer;
      } else if (subscription.customer_id) {
        customerId = String(subscription.customer_id);
      } else if (
        subscription.customer &&
        typeof subscription.customer === "object"
      ) {
        customerId = String(
          (subscription.customer as { id?: string }).id ?? ""
        );
      }
      if (!customerId) {
        customerId = customerIdFromCharge(subscription as Record<string, unknown>);
      }
      if (customerId) {
        events.push({
          type: "subscription_created",
          externalCustomerId: customerId,
          externalSubscriptionId: String(subscription.id ?? ""),
          status: String(subscription.status ?? "active"),
        });
      }
      break;
    }
    case "charge.paid": {
      const charge = data ?? {};
      const externalCustomerId = customerIdFromCharge(charge);
      if (externalCustomerId) {
        const amountCents = Number(charge.amount ?? 0);
        events.push({
          type: "payment_succeeded",
          externalCustomerId,
          externalPaymentId: String(charge.id ?? eventId),
          amountCents,
          currency: "BRL",
          paidAtIso:
            typeof charge.paid_at === "string"
              ? charge.paid_at
              : undefined,
        });
      }
      break;
    }
    case "charge.payment_failed": {
      const charge = data ?? {};
      const externalCustomerId = customerIdFromCharge(charge);
      if (externalCustomerId) {
        events.push({
          type: "payment_failed",
          externalCustomerId,
        });
      }
      break;
    }
    case "subscription.canceled": {
      const subscription = data ?? {};
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : String(
              (subscription.customer as { id?: string } | undefined)?.id ?? ""
            );
      if (customerId) {
        events.push({
          type: "subscription_canceled",
          externalCustomerId: customerId,
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
