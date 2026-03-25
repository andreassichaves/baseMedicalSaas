import type { BillingDomainEvent } from "../../domain/billing-events";

export function verifyAsaasWebhook(headers: Record<string, string | string[] | undefined>): boolean {
  const token =
    (headers["asaas-access-token"] as string | undefined) ??
    (headers["Asaas-Access-Token"] as string | undefined);
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
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

/**
 * Converte payload do webhook Asaas em eventos de dominio.
 */
export function parseAsaasWebhookPayload(body: Record<string, unknown>): {
  events: BillingDomainEvent[];
  eventType: string;
  eventId: string;
} {
  const eventType = String(body.event ?? body.Event ?? "unknown");
  const payment = body.payment as Record<string, unknown> | undefined;
  const subscription = body.subscription as Record<string, unknown> | undefined;

  const eventId =
    String(
      payment?.id ??
        subscription?.id ??
        body.id ??
        `asaas_${Date.now()}`
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
            : String(
                (subscription.customer as { id?: string })?.id ?? ""
              );
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
            : String(
                (subscription.customer as { id?: string })?.id ?? ""
              );
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
