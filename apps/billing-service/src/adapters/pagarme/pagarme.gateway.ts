import type { BillingGatewayPort } from "../../ports/billing-gateway.port";
import type {
  CreateCustomerInput,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  CardPayload,
} from "../../domain/billing-types";

const PAGARME_API_URL = "https://api.pagar.me/core/v5";

function getAuthHeader(): string {
  const apiKey = process.env.PAGARME_API_KEY;
  if (!apiKey) {
    throw new Error("PAGARME_API_KEY is required when BILLING_PROVIDER=pagarme");
  }
  return "Basic " + Buffer.from(apiKey + ":").toString("base64");
}

async function pagarmeRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${PAGARME_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("Pagarme API error:", JSON.stringify(data));
    throw new Error(
      (data.message as string) || `Pagarme API error: ${res.status}`
    );
  }
  return data as T;
}

function mapPagarmeCard(card: CardPayload) {
  return {
    number: card.number.replace(/\s/g, ""),
    holder_name: card.holder_name,
    exp_month: card.exp_month,
    exp_year: card.exp_year,
    cvv: card.cvv,
    billing_address: card.billing_address ?? {
      line_1: "Av Paulista, 1000",
      zip_code: "01310100",
      city: "Sao Paulo",
      state: "SP",
      country: "BR",
    },
  };
}

export class PagarmeBillingGateway implements BillingGatewayPort {
  readonly providerId = "pagarme" as const;

  async createCustomer(
    input: CreateCustomerInput
  ): Promise<{ customerId: string }> {
    const doc = input.document.replace(/\D/g, "");
    const customer = await pagarmeRequest<{ id: string }>("POST", "/customers", {
      name: input.name,
      email: input.email,
      document: doc,
      document_type: doc.length <= 11 ? "CPF" : "CNPJ",
      type: doc.length <= 11 ? "individual" : "company",
    });
    return { customerId: customer.id };
  }

  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult> {
    if (input.paymentMethod === "pix") {
      throw new Error(
        "Assinatura com PIX nao e suportada pelo gateway Pagar.me neste servico. Use credit_card ou boleto, ou configure BILLING_PROVIDER=asaas."
      );
    }

    const paymentMethod =
      input.paymentMethod === "boleto" ? "boleto" : "credit_card";

    const subscriptionPayload: Record<string, unknown> = {
      customer_id: input.externalCustomerId,
      payment_method: paymentMethod,
      interval: "month",
      interval_count: 1,
      billing_type: "prepaid",
      currency: "BRL",
      installments: 1,
      statement_descriptor: "Portal SaaS",
      items: [
        {
          description: input.planDescription,
          quantity: 1,
          pricing_scheme: {
            price: input.amountCents,
            scheme_type: "unit",
          },
        },
      ],
    };

    if (paymentMethod === "credit_card") {
      if (!input.card) {
        throw new Error("Card data is required for credit_card on Pagarme");
      }
      subscriptionPayload.card = mapPagarmeCard(input.card);
    }

    const subscription = await pagarmeRequest<{
      id: string;
      status: string;
      current_charge?: {
        last_transaction?: { url?: string; barcode?: string };
      };
    }>("POST", "/subscriptions", subscriptionPayload);

    const result: CreateSubscriptionResult = {
      externalSubscriptionId: subscription.id,
      status:
        subscription.status === "active"
          ? "active"
          : subscription.status === "pending"
            ? "pending"
            : "pending",
    };

    if (paymentMethod === "boleto" && subscription.current_charge?.last_transaction) {
      const tx = subscription.current_charge.last_transaction;
      result.boletoUrl = tx.url;
      result.boletoBarcode = tx.barcode;
    }

    return result;
  }

  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    await pagarmeRequest("DELETE", `/subscriptions/${externalSubscriptionId}`);
  }

  async updatePaymentMethod(
    externalSubscriptionId: string,
    card: CardPayload
  ): Promise<void> {
    await pagarmeRequest(
      "PATCH",
      `/subscriptions/${externalSubscriptionId}`,
      {
        payment_method: "credit_card",
        card: mapPagarmeCard(card),
      }
    );
  }
}
