import type { BillingDomainEvent } from "../domain/billing-events";

export interface OrgRow {
  id: string;
  name: string;
  external_customer_id: string | null;
}

export interface OrgBillingStatusRow {
  subscription_status: string;
  plan: string;
  trial_ends_at: string | null;
}

/**
 * Porta de persistencia: abstrai Supabase para o dominio de billing.
 * Colunas legadas no DB: stripe_customer_id, stripe_subscription_id, stripe_invoice_id, stripe_event_id.
 */
export interface BillingPersistencePort {
  getOrganization(orgId: string): Promise<OrgRow | null>;

  getOrganizationBillingStatus(
    orgId: string
  ): Promise<OrgBillingStatusRow | null>;

  setExternalCustomerId(orgId: string, customerId: string): Promise<void>;

  updateOrganization(
    orgId: string,
    fields: { subscription_status?: string; plan?: string }
  ): Promise<void>;

  findOrgIdByExternalCustomerId(
    externalCustomerId: string
  ): Promise<string | null>;

  updateOrganizationByExternalCustomerId(
    externalCustomerId: string,
    fields: { subscription_status?: string; plan?: string }
  ): Promise<void>;

  insertSubscription(row: {
    org_id: string;
    external_subscription_id: string;
    status: string;
    plan: string;
  }): Promise<void>;

  upsertSubscription(row: {
    org_id: string;
    external_subscription_id: string;
    status: string;
    plan: string;
  }): Promise<void>;

  getLatestSubscriptionForOrg(
    orgId: string,
    statuses: string[]
  ): Promise<{ external_subscription_id: string } | null>;

  updateSubscriptionByExternalId(
    externalSubscriptionId: string,
    fields: { status?: string; canceled_at?: string | null }
  ): Promise<void>;

  updateSubscriptionsByOrgIdWhereStatusIn(
    orgId: string,
    statusesIn: string[],
    fields: { status: string }
  ): Promise<void>;

  upsertInvoice(row: {
    org_id: string;
    external_invoice_id: string;
    amount_cents: number;
    currency: string;
    status: string;
    period_start: string;
    period_end: string;
  }): Promise<void>;

  insertPaymentEvent(row: {
    org_id: string | null;
    external_event_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  }): Promise<void>;

  /** Aplica eventos normalizados (usado apos parse do webhook). */
  applyDomainEvents(events: BillingDomainEvent[]): Promise<void>;
}
