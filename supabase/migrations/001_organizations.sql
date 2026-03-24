CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  stripe_customer_id text,
  subscription_status text NOT NULL DEFAULT 'trialing',
  plan text NOT NULL DEFAULT 'free',
  trial_ends_at timestamptz DEFAULT now() + interval '14 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_subscription_status CHECK (
    subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid')
  ),
  CONSTRAINT valid_plan CHECK (
    plan IN ('free', 'starter', 'pro', 'enterprise')
  )
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id);
