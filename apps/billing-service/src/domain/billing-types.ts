export type PaymentMethod = "credit_card" | "boleto" | "pix";

export interface CreateCustomerInput {
  name: string;
  email: string;
  document: string;
}

export interface CardPayload {
  number: string;
  holder_name: string;
  exp_month: number;
  exp_year: number;
  cvv: string;
  billing_address?: {
    line_1: string;
    zip_code: string;
    city: string;
    state: string;
    country: string;
  };
}

export interface CreateSubscriptionInput {
  externalCustomerId: string;
  paymentMethod: PaymentMethod;
  card?: CardPayload;
  /** Valor em centavos (ex.: 60000 = R$600) */
  amountCents: number;
  planDescription: string;
  /** Obrigatorio para cartao no Asaas (creditCardHolderInfo). */
  customer?: CreateCustomerInput;
}

export interface CreateSubscriptionResult {
  externalSubscriptionId: string;
  status: string;
  boletoUrl?: string;
  boletoBarcode?: string;
  /** Base64 da imagem do QR (campo `encodedImage` do Asaas). */
  pixQrCode?: string;
  /** Copia e cola (payload BR Code). */
  pixCopyPaste?: string;
}
