import type { SupabaseClient } from "@supabase/supabase-js";
import type { BillingDomainEvent } from "../../domain/billing-events";
import type {
  BillingPersistencePort,
  OrgBillingStatusRow,
  OrgRow,
} from "../../ports/billing-persistence.port";

/**
 * Adaptador: persiste billing no Supabase usando nomes de coluna legados (stripe_*).
 */
export class SupabaseBillingPersistence implements BillingPersistencePort {
  constructor(private readonly db: SupabaseClient) {}

  async getOrganizationBillingStatus(
    orgId: string
  ): Promise<OrgBillingStatusRow | null> {
    const { data, error } = await this.db
      .from("organizations")
      .select("subscription_status, plan, trial_ends_at")
      .eq("id", orgId)
      .single();

    if (error || !data) return null;
    return {
      subscription_status: data.subscription_status,
      plan: data.plan,
      trial_ends_at: data.trial_ends_at,
    };
  }

  async getOrganization(orgId: string): Promise<OrgRow | null> {
    const { data, error } = await this.db
      .from("organizations")
      .select("id, name, stripe_customer_id")
      .eq("id", orgId)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      external_customer_id: data.stripe_customer_id,
    };
  }

  async setExternalCustomerId(orgId: string, customerId: string): Promise<void> {
    await this.db
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", orgId);
  }

  async updateOrganization(
    orgId: string,
    fields: { subscription_status?: string; plan?: string }
  ): Promise<void> {
    await this.db.from("organizations").update(fields).eq("id", orgId);
  }

  async findOrgIdByExternalCustomerId(
    externalCustomerId: string
  ): Promise<string | null> {
    const { data } = await this.db
      .from("organizations")
      .select("id")
      .eq("stripe_customer_id", externalCustomerId)
      .single();

    return data?.id ?? null;
  }

  async updateOrganizationByExternalCustomerId(
    externalCustomerId: string,
    fields: { subscription_status?: string; plan?: string }
  ): Promise<void> {
    await this.db
      .from("organizations")
      .update(fields)
      .eq("stripe_customer_id", externalCustomerId);
  }

  async insertSubscription(row: {
    org_id: string;
    external_subscription_id: string;
    status: string;
    plan: string;
  }): Promise<void> {
    await this.db.from("subscriptions").insert({
      org_id: row.org_id,
      stripe_subscription_id: row.external_subscription_id,
      status: row.status,
      plan: row.plan,
    });
  }

  async upsertSubscription(row: {
    org_id: string;
    external_subscription_id: string;
    status: string;
    plan: string;
  }): Promise<void> {
    await this.db.from("subscriptions").upsert(
      {
        org_id: row.org_id,
        stripe_subscription_id: row.external_subscription_id,
        status: row.status,
        plan: row.plan,
      },
      { onConflict: "stripe_subscription_id" }
    );
  }

  async getLatestSubscriptionForOrg(
    orgId: string,
    statuses: string[]
  ): Promise<{ external_subscription_id: string } | null> {
    const { data } = await this.db
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("org_id", orgId)
      .in("status", statuses)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.stripe_subscription_id) return null;
    return { external_subscription_id: data.stripe_subscription_id };
  }

  async updateSubscriptionByExternalId(
    externalSubscriptionId: string,
    fields: { status?: string; canceled_at?: string | null }
  ): Promise<void> {
    await this.db
      .from("subscriptions")
      .update(fields)
      .eq("stripe_subscription_id", externalSubscriptionId);
  }

  async updateSubscriptionsByOrgIdWhereStatusIn(
    orgId: string,
    statusesIn: string[],
    fields: { status: string }
  ): Promise<void> {
    await this.db
      .from("subscriptions")
      .update(fields)
      .eq("org_id", orgId)
      .in("status", statusesIn);
  }

  async upsertInvoice(row: {
    org_id: string;
    external_invoice_id: string;
    amount_cents: number;
    currency: string;
    status: string;
    period_start: string;
    period_end: string;
  }): Promise<void> {
    await this.db.from("invoices").upsert(
      {
        org_id: row.org_id,
        stripe_invoice_id: row.external_invoice_id,
        amount_cents: row.amount_cents,
        currency: row.currency,
        status: row.status,
        period_start: row.period_start,
        period_end: row.period_end,
      },
      { onConflict: "stripe_invoice_id" }
    );
  }

  async insertPaymentEvent(row: {
    org_id: string | null;
    external_event_id: string;
    event_type: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.db.from("payment_events").insert({
      org_id: row.org_id,
      stripe_event_id: row.external_event_id,
      event_type: row.event_type,
      payload: row.payload,
    });
  }

  async applyDomainEvents(events: BillingDomainEvent[]): Promise<void> {
    for (const event of events) {
      switch (event.type) {
        case "subscription_created": {
          const orgId = await this.findOrgIdByExternalCustomerId(
            event.externalCustomerId
          );
          if (orgId) {
            await this.upsertSubscription({
              org_id: orgId,
              external_subscription_id: event.externalSubscriptionId,
              status: event.status,
              plan: "pro",
            });
          }
          break;
        }
        case "payment_succeeded": {
          const orgId = await this.findOrgIdByExternalCustomerId(
            event.externalCustomerId
          );
          if (orgId) {
            await this.updateOrganization(orgId, {
              subscription_status: "active",
            });
            await this.upsertInvoice({
              org_id: orgId,
              external_invoice_id: event.externalPaymentId,
              amount_cents: event.amountCents,
              currency: event.currency.toLowerCase(),
              status: "paid",
              period_start:
                event.paidAtIso ?? new Date().toISOString(),
              period_end:
                event.paidAtIso ?? new Date().toISOString(),
            });
            await this.updateSubscriptionsByOrgIdWhereStatusIn(
              orgId,
              ["pending", "past_due"],
              { status: "active" }
            );
          }
          break;
        }
        case "payment_failed": {
          await this.updateOrganizationByExternalCustomerId(
            event.externalCustomerId,
            { subscription_status: "past_due" }
          );
          break;
        }
        case "subscription_canceled": {
          await this.updateOrganizationByExternalCustomerId(
            event.externalCustomerId,
            { subscription_status: "canceled", plan: "free" }
          );
          if (event.externalSubscriptionId) {
            await this.updateSubscriptionByExternalId(
              event.externalSubscriptionId,
              {
                status: "canceled",
                canceled_at: new Date().toISOString(),
              }
            );
          }
          break;
        }
        case "payment_refunded": {
          const orgId = await this.findOrgIdByExternalCustomerId(
            event.externalCustomerId
          );
          if (orgId) {
            await this.db
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
}
