export const PORTAL_ROLES = {
  ACCOUNT_OWNER: "account_owner",
  ACCOUNT_ADMIN: "account_admin",
  BILLING_VIEWER: "billing_viewer",
  MEMBER: "member",
} as const;

export type PortalRole = (typeof PORTAL_ROLES)[keyof typeof PORTAL_ROLES];

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  account_owner: "Proprietário",
  account_admin: "Administrador",
  billing_viewer: "Visualizador Financeiro",
  member: "Membro",
};

export function canManageSubscription(role: PortalRole): boolean {
  return role === PORTAL_ROLES.ACCOUNT_OWNER || role === PORTAL_ROLES.ACCOUNT_ADMIN;
}

export function canManageUsers(role: PortalRole): boolean {
  return role === PORTAL_ROLES.ACCOUNT_OWNER || role === PORTAL_ROLES.ACCOUNT_ADMIN;
}

export function canViewInvoices(role: PortalRole): boolean {
  return (
    role === PORTAL_ROLES.ACCOUNT_OWNER ||
    role === PORTAL_ROLES.ACCOUNT_ADMIN ||
    role === PORTAL_ROLES.BILLING_VIEWER
  );
}
