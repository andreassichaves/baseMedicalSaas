export interface Organization {
  id: string;
  name: string;
  slug: string;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  plan: Plan;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type Plan = "free" | "starter" | "pro" | "enterprise";

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  portal_role: PortalRole;
  status: MemberStatus;
  joined_at: string;
}

export type PortalRole =
  | "account_owner"
  | "account_admin"
  | "billing_viewer"
  | "member";

export type MemberStatus = "active" | "invited" | "suspended";

export interface Subscription {
  id: string;
  org_id: string;
  stripe_subscription_id: string;
  status: string;
  plan: string;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  org_id: string;
  stripe_invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  hosted_invoice_url: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}
