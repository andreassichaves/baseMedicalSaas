import type { BillingGatewayPort } from "../../ports/billing-gateway.port";
import type {
  CreateCustomerInput,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  CardPayload,
} from "../../domain/billing-types";

const DEFAULT_BASE = "https://api-sandbox.asaas.com/v3";

function asaasHeaders(): Record<string, string> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY is required when BILLING_PROVIDER=asaas");
  return {
    "Content-Type": "application/json",
    access_token: key,
    "User-Agent": process.env.ASAAS_USER_AGENT ?? "baseMedicalSaas-billing/1.0",
  };
}

function baseUrl(): string {
  return process.env.ASAAS_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_BASE;
}

async function asaasRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: asaasHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    console.error("Asaas API error:", JSON.stringify(data));
    const errors = data.errors as { description?: string }[] | undefined;
    const msg =
      errors?.[0]?.description ??
      (data.message as string) ??
      `Asaas error: ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

function nextDueDateToday(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function documentDigits(doc: string): string {
  return doc.replace(/\D/g, "");
}

function mapBillingType(
  method: CreateSubscriptionInput["paymentMethod"]
): "BOLETO" | "CREDIT_CARD" | "PIX" {
  if (method === "boleto") return "BOLETO";
  if (method === "pix") return "PIX";
  return "CREDIT_CARD";
}

/** Primeira cobranca PIX pendente da assinatura + QR dinamico (Asaas). */
async function fetchPixQrForSubscription(
  subscriptionId: string
): Promise<{ encodedImage: string; payload: string } | null> {
  const list = await asaasRequest<{
    data?: Array<{ id: string; billingType: string; status: string }>;
  }>("GET", `/payments?subscription=${subscriptionId}&limit=20`);

  const payment = list.data?.find((p) => {
    const bt = (p.billingType ?? "").toUpperCase();
    const st = (p.status ?? "").toUpperCase();
    return bt === "PIX" && st !== "RECEIVED" && st !== "CONFIRMED";
  });
  if (!payment?.id) return null;

  const qr = await asaasRequest<{
    encodedImage?: string;
    payload?: string;
  }>("GET", `/payments/${payment.id}/pixQrCode`);

  if (qr.payload == null && qr.encodedImage == null) return null;
  return {
    encodedImage: qr.encodedImage ?? "",
    payload: qr.payload ?? "",
  };
}

function buildCreditCardPayload(
  card: CardPayload,
  customer: CreateCustomerInput
) {
  const zip = card.billing_address?.zip_code?.replace(/\D/g, "") ?? "01310100";
  return {
    creditCard: {
      holderName: card.holder_name,
      number: card.number.replace(/\s/g, ""),
      expiryMonth: String(card.exp_month).padStart(2, "0"),
      expiryYear: String(card.exp_year),
      ccv: card.cvv,
    },
    creditCardHolderInfo: {
      name: customer.name,
      email: customer.email,
      cpfCnpj: documentDigits(customer.document),
      postalCode: zip,
      addressNumber: "S/N",
      phone: "11999999999",
      mobilePhone: "11999999999",
    },
  };
}

export class AsaasBillingGateway implements BillingGatewayPort {
  readonly providerId = "asaas" as const;

  async createCustomer(
    input: CreateCustomerInput
  ): Promise<{ customerId: string }> {
    const body = {
      name: input.name,
      email: input.email,
      cpfCnpj: documentDigits(input.document),
      notificationDisabled: false,
    };
    const created = await asaasRequest<{ id: string }>("POST", "/customers", body);
    return { customerId: created.id };
  }

  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult> {
    const valueReais = input.amountCents / 100;
    const billingType = mapBillingType(input.paymentMethod);

    const payload: Record<string, unknown> = {
      customer: input.externalCustomerId,
      billingType,
      value: valueReais,
      nextDueDate: nextDueDateToday(),
      cycle: "MONTHLY",
      description: input.planDescription,
    };

    if (billingType === "CREDIT_CARD") {
      if (!input.card || !input.customer) {
        throw new Error(
          "Card and customer details are required for CREDIT_CARD on Asaas"
        );
      }
      Object.assign(
        payload,
        buildCreditCardPayload(input.card, input.customer)
      );
    }

    const sub = await asaasRequest<{
      id: string;
      status: string;
      nextDueDate?: string;
    }>("POST", "/subscriptions", payload);

    const result: CreateSubscriptionResult = {
      externalSubscriptionId: sub.id,
      status: mapAsaasSubscriptionStatus(sub.status),
    };

    if (billingType === "PIX") {
      const pix = await fetchPixQrForSubscription(sub.id);
      if (pix) {
        result.pixQrCode = pix.encodedImage;
        result.pixCopyPaste = pix.payload;
      }
    }

    return result;
  }

  async cancelSubscription(externalSubscriptionId: string): Promise<void> {
    await asaasRequest("DELETE", `/subscriptions/${externalSubscriptionId}`);
  }

  async updatePaymentMethod(
    externalSubscriptionId: string,
    card: CardPayload
  ): Promise<void> {
    const payload = buildCreditCardPayload(card, {
      name: card.holder_name,
      email: "update@local.invalid",
      document: "00000000000",
    });
    await asaasRequest(
      "PUT",
      `/subscriptions/${externalSubscriptionId}/creditCard`,
      payload
    );
  }
}

function mapAsaasSubscriptionStatus(s: string): string {
  const active = ["ACTIVE", "CONFIRMED"];
  if (active.includes(s)) return "active";
  if (s === "EXPIRED") return "canceled";
  return "pending";
}
