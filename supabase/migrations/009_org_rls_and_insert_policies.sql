ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_org" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "authenticated_can_create_org" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner_can_update_org" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND portal_role IN ('account_owner', 'account_admin')
    )
  );

CREATE POLICY "authenticated_can_insert_member" ON org_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admin_can_update_members" ON org_members
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
        AND portal_role IN ('account_owner', 'account_admin')
    )
  );
