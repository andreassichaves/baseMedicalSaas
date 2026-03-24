CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id),
  CONSTRAINT valid_portal_role CHECK (
    portal_role IN ('account_owner', 'account_admin', 'billing_viewer', 'member')
  ),
  CONSTRAINT valid_status CHECK (
    status IN ('active', 'invited', 'suspended')
  )
);

CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_view_own_org" ON org_members
  FOR SELECT USING (
    org_id = (auth.jwt()->>'org_id')::uuid
  );
