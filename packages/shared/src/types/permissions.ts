export interface SaasProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  is_coming_soon: boolean;
  display_order: number;
}

export interface SaasRole {
  id: string;
  saas_product_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  org_id: string | null;
}

export interface SaasPermission {
  id: string;
  saas_product_id: string;
  code: string;
  description: string;
  category: string;
}

export interface SaasAccess {
  id: string;
  org_member_id: string;
  saas_product_id: string;
  saas_role_id: string;
}

export interface UserPermissions {
  role_name: string;
  permissions: string[];
}
