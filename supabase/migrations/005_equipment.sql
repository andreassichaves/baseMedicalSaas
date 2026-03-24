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
