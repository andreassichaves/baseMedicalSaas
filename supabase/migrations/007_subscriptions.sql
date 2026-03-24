CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL,
  plan text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL,
  hosted_invoice_url text,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_invoices_org ON invoices(org_id);
CREATE INDEX idx_payment_events_type ON payment_events(event_type);
