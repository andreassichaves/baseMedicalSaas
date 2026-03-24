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
