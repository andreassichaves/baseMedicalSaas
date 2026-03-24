import type { PortalRole } from "../types/organization";

export const PORTAL_ROLES: Record<string, PortalRole> = {
  ACCOUNT_OWNER: "account_owner",
  ACCOUNT_ADMIN: "account_admin",
  BILLING_VIEWER: "billing_viewer",
  MEMBER: "member",
};

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  account_owner: "Proprietário",
  account_admin: "Administrador",
  billing_viewer: "Visualizador Financeiro",
  member: "Membro",
};

export const PORTAL_ROLE_CAPABILITIES: Record<
  PortalRole,
  { manage_subscription: boolean; manage_users: boolean; view_invoices: boolean }
> = {
  account_owner: { manage_subscription: true, manage_users: true, view_invoices: true },
  account_admin: { manage_subscription: true, manage_users: true, view_invoices: true },
  billing_viewer: { manage_subscription: false, manage_users: false, view_invoices: true },
  member: { manage_subscription: false, manage_users: false, view_invoices: false },
};
