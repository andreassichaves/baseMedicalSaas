import type {
  CreateCustomerInput,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  CardPayload,
} from "../domain/billing-types";

/**
 * Porta de saida: contrato que qualquer provedor de pagamento deve implementar.
 */
export interface BillingGatewayPort {
  readonly providerId: "asaas" | "pagarme";

  createCustomer(input: CreateCustomerInput): Promise<{ customerId: string }>;

  createSubscription(
    input: CreateSubscriptionInput
  ): Promise<CreateSubscriptionResult>;

  cancelSubscription(externalSubscriptionId: string): Promise<void>;

  updatePaymentMethod?(
    externalSubscriptionId: string,
    card: CardPayload
  ): Promise<void>;
}
