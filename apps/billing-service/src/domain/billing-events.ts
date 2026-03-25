/**
 * Eventos normalizados do dominio de billing (independentes do gateway).
 * Qualquer adaptador (Asaas, Pagar.me, etc.) deve mapear webhooks para estes tipos.
 */

export type BillingDomainEvent =
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
  | {
      type: "payment_failed";
      externalCustomerId: string;
    }
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

export type BillingProviderId = "asaas" | "pagarme";
