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
CREATE TABLE saas_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon_url text,
  is_active boolean NOT NULL DEFAULT false,
  is_coming_soon boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0
);

INSERT INTO saas_products (name, slug, description, is_active, is_coming_soon, display_order)
VALUES
  (
    'Inventário de Equipamentos',
    'equipment-inventory',
    'Gerencie seus equipamentos e manutenções preventivas e corretivas.',
    true, false, 1
  ),
  (
    'Prontuário Eletrônico',
    'electronic-health-record',
    'Gestão completa de prontuários de pacientes.',
    false, true, 2
  ),
  (
    'Inteligência de Dados',
    'data-intelligence',
    'Dashboards e análises avançadas dos seus dados.',
    false, true, 3
  );
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  UNIQUE(org_id, name)
);

CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  address text,
  UNIQUE(org_id, name)
);

CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  serial_number text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  description text,
  purchase_date date,
  purchase_cost numeric(12, 2),
  photo_url text,
  custom_fields jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (
    status IN ('active', 'inactive', 'maintenance', 'decommissioned')
  )
);

CREATE INDEX idx_equipment_org ON equipment(org_id);
CREATE INDEX idx_equipment_category ON equipment(category_id);
CREATE INDEX idx_equipment_location ON equipment(location_id);
CREATE INDEX idx_equipment_status ON equipment(org_id, status);
CREATE INDEX idx_categories_org ON categories(org_id);
CREATE INDEX idx_locations_org ON locations(org_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON categories
  FOR ALL USING (org_id = (auth.jwt()->>'org_id')::uuid);

CREATE POLICY "tenant_isolation" ON locations
  FOR ALL USING (org_id = (auth.jwt()->>'org_id')::uuid);

CREATE POLICY "tenant_isolation" ON equipment
  FOR ALL USING (org_id = (auth.jwt()->>'org_id')::uuid);
CREATE TABLE maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  type text NOT NULL,
  performed_date date NOT NULL,
  description text,
  technician text,
  cost numeric(12, 2),
  status text NOT NULL DEFAULT 'completed',
  attachments_urls text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('preventive', 'corrective', 'predictive')),
  CONSTRAINT valid_status CHECK (status IN ('completed', 'in_progress', 'scheduled'))
);

CREATE TABLE maintenance_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  frequency_type text NOT NULL,
  frequency_value integer NOT NULL,
  next_due_date date NOT NULL,
  last_performed_date date,
  alert_days_before integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_frequency CHECK (frequency_type IN ('days', 'weeks', 'months')),
  CONSTRAINT positive_frequency CHECK (frequency_value > 0),
  CONSTRAINT positive_alert CHECK (alert_days_before >= 0)
);

CREATE INDEX idx_maintenance_records_org ON maintenance_records(org_id);
CREATE INDEX idx_maintenance_records_equipment ON maintenance_records(equipment_id);
CREATE INDEX idx_maintenance_schedules_org ON maintenance_schedules(org_id);
CREATE INDEX idx_maintenance_schedules_due ON maintenance_schedules(next_due_date) WHERE is_active = true;

ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON maintenance_records
  FOR ALL USING (org_id = (auth.jwt()->>'org_id')::uuid);

CREATE POLICY "tenant_isolation" ON maintenance_schedules
  FOR ALL USING (org_id = (auth.jwt()->>'org_id')::uuid);
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
-- Permissions for each SaaS product
CREATE TABLE saas_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_product_id uuid NOT NULL REFERENCES saas_products(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  UNIQUE(saas_product_id, code)
);

-- System-defined default roles per product
CREATE TABLE saas_default_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_product_id uuid NOT NULL REFERENCES saas_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true,
  UNIQUE(saas_product_id, name)
);

-- Custom roles created by each organization
CREATE TABLE saas_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  saas_product_id uuid NOT NULL REFERENCES saas_products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  UNIQUE(org_id, saas_product_id, name)
);

-- Maps roles (default or custom) to permissions
CREATE TABLE saas_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  role_type text NOT NULL,
  permission_id uuid NOT NULL REFERENCES saas_permissions(id) ON DELETE CASCADE,
  CONSTRAINT valid_role_type CHECK (role_type IN ('default', 'custom')),
  UNIQUE(role_id, permission_id)
);

-- Which member has access to which product with which role
CREATE TABLE saas_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_member_id uuid NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  saas_product_id uuid NOT NULL REFERENCES saas_products(id) ON DELETE CASCADE,
  saas_role_id uuid NOT NULL,
  role_type text NOT NULL DEFAULT 'default',
  UNIQUE(org_member_id, saas_product_id),
  CONSTRAINT valid_role_type CHECK (role_type IN ('default', 'custom'))
);

CREATE INDEX idx_saas_access_member ON saas_access(org_member_id);
CREATE INDEX idx_saas_access_product ON saas_access(saas_product_id);

-- Seed: Equipment Inventory permissions
DO $$
DECLARE
  v_product_id uuid;
  v_admin_id uuid;
  v_manager_id uuid;
  v_operator_id uuid;
  v_viewer_id uuid;
  v_perm_id uuid;
BEGIN
  SELECT id INTO v_product_id FROM saas_products WHERE slug = 'equipment-inventory';

  -- Create permissions
  INSERT INTO saas_permissions (saas_product_id, code, description, category) VALUES
    (v_product_id, 'equipment.view', 'Visualizar equipamentos', 'Equipamentos'),
    (v_product_id, 'equipment.create', 'Cadastrar equipamentos', 'Equipamentos'),
    (v_product_id, 'equipment.edit', 'Editar equipamentos', 'Equipamentos'),
    (v_product_id, 'equipment.delete', 'Remover equipamentos', 'Equipamentos'),
    (v_product_id, 'category.manage', 'Gerenciar categorias', 'Equipamentos'),
    (v_product_id, 'location.manage', 'Gerenciar localizações', 'Equipamentos'),
    (v_product_id, 'maintenance.view', 'Visualizar manutenções', 'Manutenções'),
    (v_product_id, 'maintenance.create', 'Registrar manutenções', 'Manutenções'),
    (v_product_id, 'maintenance.edit', 'Editar manutenções', 'Manutenções'),
    (v_product_id, 'maintenance.delete', 'Remover manutenções', 'Manutenções'),
    (v_product_id, 'schedule.view', 'Visualizar agendamentos', 'Agendamentos'),
    (v_product_id, 'schedule.manage', 'Gerenciar agendamentos', 'Agendamentos'),
    (v_product_id, 'reports.view', 'Acessar relatórios', 'Relatórios');

  -- Create default roles
  INSERT INTO saas_default_roles (saas_product_id, name, description) VALUES
    (v_product_id, 'saas_admin', 'Acesso total ao produto')
    RETURNING id INTO v_admin_id;
  INSERT INTO saas_default_roles (saas_product_id, name, description) VALUES
    (v_product_id, 'manager', 'Gerente — tudo exceto exclusão')
    RETURNING id INTO v_manager_id;
  INSERT INTO saas_default_roles (saas_product_id, name, description) VALUES
    (v_product_id, 'operator', 'Operador — criar e editar')
    RETURNING id INTO v_operator_id;
  INSERT INTO saas_default_roles (saas_product_id, name, description) VALUES
    (v_product_id, 'viewer', 'Somente visualização')
    RETURNING id INTO v_viewer_id;

  -- saas_admin: all permissions
  FOR v_perm_id IN SELECT id FROM saas_permissions WHERE saas_product_id = v_product_id
  LOOP
    INSERT INTO saas_role_permissions (role_id, role_type, permission_id)
    VALUES (v_admin_id, 'default', v_perm_id);
  END LOOP;

  -- manager: all except *.delete
  FOR v_perm_id IN
    SELECT id FROM saas_permissions
    WHERE saas_product_id = v_product_id AND code NOT LIKE '%.delete'
  LOOP
    INSERT INTO saas_role_permissions (role_id, role_type, permission_id)
    VALUES (v_manager_id, 'default', v_perm_id);
  END LOOP;

  -- operator: view + create + edit for equipment and maintenance, schedule.view
  FOR v_perm_id IN
    SELECT id FROM saas_permissions
    WHERE saas_product_id = v_product_id
      AND code IN (
        'equipment.view', 'equipment.create', 'equipment.edit',
        'maintenance.view', 'maintenance.create', 'maintenance.edit',
        'schedule.view'
      )
  LOOP
    INSERT INTO saas_role_permissions (role_id, role_type, permission_id)
    VALUES (v_operator_id, 'default', v_perm_id);
  END LOOP;

  -- viewer: view only
  FOR v_perm_id IN
    SELECT id FROM saas_permissions
    WHERE saas_product_id = v_product_id
      AND code IN ('equipment.view', 'maintenance.view', 'schedule.view', 'reports.view')
  LOOP
    INSERT INTO saas_role_permissions (role_id, role_type, permission_id)
    VALUES (v_viewer_id, 'default', v_perm_id);
  END LOOP;
END $$;
-- Function to check if a user has a specific permission for a product
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id uuid,
  p_org_id uuid,
  p_product_slug text,
  p_permission_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_perm boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM saas_access sa
    JOIN org_members om ON om.id = sa.org_member_id
    JOIN saas_products sp ON sp.id = sa.saas_product_id
    JOIN saas_role_permissions srp ON srp.role_id = sa.saas_role_id
    JOIN saas_permissions p ON p.id = srp.permission_id
    WHERE om.user_id = p_user_id
      AND om.org_id = p_org_id
      AND sp.slug = p_product_slug
      AND p.code = p_permission_code
      AND om.status = 'active'
  ) INTO has_perm;

  RETURN has_perm;
END;
$$;

-- Function to get all permissions for a user in a product
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id uuid,
  p_product_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'role_name', COALESCE(
      (SELECT sdr.name FROM saas_default_roles sdr WHERE sdr.id = sa.saas_role_id),
      (SELECT scr.name FROM saas_custom_roles scr WHERE scr.id = sa.saas_role_id)
    ),
    'permissions', COALESCE(
      (SELECT jsonb_agg(p.code)
       FROM saas_role_permissions srp
       JOIN saas_permissions p ON p.id = srp.permission_id
       WHERE srp.role_id = sa.saas_role_id),
      '[]'::jsonb
    )
  ) INTO result
  FROM saas_access sa
  JOIN org_members om ON om.id = sa.org_member_id
  JOIN saas_products sp ON sp.id = sa.saas_product_id
  WHERE om.user_id = p_user_id
    AND sp.slug = p_product_slug
    AND om.status = 'active'
  LIMIT 1;

  RETURN COALESCE(result, jsonb_build_object('role_name', null, 'permissions', '[]'::jsonb));
END;
$$;
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
