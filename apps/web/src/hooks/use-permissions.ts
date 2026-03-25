"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PermissionsState {
  permissions: string[];
  role: string | null;
  loading: boolean;
  hasPermission: (code: string) => boolean;
}

export function usePermissions(productSlug: string): PermissionsState {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchPermissions() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase.rpc("get_user_permissions", {
        p_user_id: user.id,
        p_product_slug: productSlug,
      });

      if (data) {
        setPermissions(data.permissions ?? []);
        setRole(data.role_name ?? null);
      }

      setLoading(false);
    }

    fetchPermissions();
  }, [productSlug]);

  return {
    permissions,
    role,
    loading,
    hasPermission: (code: string) => permissions.includes(code),
  };
}
