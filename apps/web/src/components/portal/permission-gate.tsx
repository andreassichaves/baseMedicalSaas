"use client";

import { usePermissions } from "@/hooks/use-permissions";
import type { ReactNode } from "react";

interface PermissionGateProps {
  permission: string;
  productSlug?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  productSlug = "equipment-inventory",
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions(productSlug);

  if (loading) return null;
  if (!hasPermission(permission)) return <>{fallback}</>;

  return <>{children}</>;
}
