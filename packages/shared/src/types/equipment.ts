export interface Equipment {
  id: string;
  org_id: string;
  name: string;
  serial_number: string | null;
  category_id: string | null;
  location_id: string | null;
  status: EquipmentStatus;
  description: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  photo_url: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "decommissioned";

export interface Category {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  color: string | null;
}

export interface Location {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  address: string | null;
}

export interface MaintenanceRecord {
  id: string;
  org_id: string;
  equipment_id: string;
  type: MaintenanceType;
  performed_date: string;
  description: string | null;
  technician: string | null;
  cost: number | null;
  status: MaintenanceStatus;
  attachments_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export type MaintenanceType = "preventive" | "corrective" | "predictive";

export type MaintenanceStatus = "completed" | "in_progress" | "scheduled";

export interface MaintenanceSchedule {
  id: string;
  org_id: string;
  equipment_id: string;
  frequency_type: FrequencyType;
  frequency_value: number;
  next_due_date: string;
  last_performed_date: string | null;
  alert_days_before: number;
  is_active: boolean;
  created_at: string;
}

export type FrequencyType = "days" | "weeks" | "months";
