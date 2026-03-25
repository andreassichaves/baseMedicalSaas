"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  plan: string;
  trial_ends_at: string | null;
}

interface OrgState {
  organization: Organization | null;
  loading: boolean;
}

export function useOrganization(orgId: string | null): OrgState {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchOrg() {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, slug, subscription_status, plan, trial_ends_at")
        .eq("id", orgId)
        .single();

      setOrganization(data);
      setLoading(false);
    }

    fetchOrg();
  }, [orgId]);

  return { organization, loading };
}
