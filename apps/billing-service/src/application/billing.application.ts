import type { BillingGatewayPort } from "../ports/billing-gateway.port";
import type { BillingPersistencePort } from "../ports/billing-persistence.port";
import type {
  CardPayload,
  CreateCustomerInput,
  PaymentMethod,
} from "../domain/billing-types";
import type { BillingDomainEvent } from "../domain/billing-events";

const PRO_PLAN_PRICE_CENTS = 60000;
const PRO_PLAN_DESCRIPTION = "Plano Pro - Portal SaaS";

export class BillingApplication {
  constructor(
    private readonly persistence: BillingPersistencePort,
    private readonly gateway: BillingGatewayPort
  ) {}

  get activeProvider(): string {
    return this.gateway.providerId;
  }

  async createSubscription(params: {
    orgId: string;
    paymentMethod: PaymentMethod;
    card?: CardPayload;
    customer: CreateCustomerInput;
  }): Promise<{
    subscription_id: string;
    status: string;
    boleto_url?: string;
    boleto_barcode?: string;
    pix_qr_code?: string;
    pix_copy_paste?: string;
  }> {
    const org = await this.persistence.getOrganization(params.orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    let customerId = org.external_customer_id;

    if (!customerId) {
      const created = await this.gateway.createCustomer(params.customer);
      customerId = created.customerId;
      await this.persistence.setExternalCustomerId(params.orgId, customerId);
    }

    const result = await this.gateway.createSubscription({
      externalCustomerId: customerId,
      paymentMethod: params.paymentMethod,
      card: params.card,
      amountCents: PRO_PLAN_PRICE_CENTS,
      planDescription: PRO_PLAN_DESCRIPTION,
      customer: params.customer,
    });

    const subStatus =
      result.status === "active" ? "active" : "pending";

    await this.persistence.updateOrganization(params.orgId, {
      subscription_status: subStatus,
      plan: "pro",
    });

    await this.persistence.insertSubscription({
      org_id: params.orgId,
      external_subscription_id: result.externalSubscriptionId,
      status: result.status,
      plan: "pro",
    });

    return {
      subscription_id: result.externalSubscriptionId,
      status: result.status,
      boleto_url: result.boletoUrl,
      boleto_barcode: result.boletoBarcode,
      pix_qr_code: result.pixQrCode,
      pix_copy_paste: result.pixCopyPaste,
    };
  }

  async cancelSubscription(orgId: string): Promise<void> {
    const sub = await this.persistence.getLatestSubscriptionForOrg(orgId, [
      "active",
      "pending",
    ]);
    if (!sub) {
      throw new Error("Active subscription not found");
    }

    await this.gateway.cancelSubscription(sub.external_subscription_id);

    await this.persistence.updateOrganization(orgId, {
      subscription_status: "canceled",
      plan: "free",
    });

    await this.persistence.updateSubscriptionByExternalId(
      sub.external_subscription_id,
      {
        status: "canceled",
        canceled_at: new Date().toISOString(),
      }
    );
  }

  async updatePayment(orgId: string, card: CardPayload): Promise<void> {
    const sub = await this.persistence.getLatestSubscriptionForOrg(orgId, [
      "active",
      "past_due",
    ]);
    if (!sub) {
      throw new Error("Subscription not found");
    }

    if (!this.gateway.updatePaymentMethod) {
      throw new Error("Gateway does not support update payment method");
    }

    await this.gateway.updatePaymentMethod(
      sub.external_subscription_id,
      card
    );
  }

  async getStatus(orgId: string) {
    return this.persistence.getOrganizationBillingStatus(orgId);
  }
}
