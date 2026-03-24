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
