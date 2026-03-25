"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  plan: string;
  trial_ends_at: string | null;
}

interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  orgId: string | null;
  portalRole: string | null;
  organization: Organization | null;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    orgId: null,
    portalRole: null,
    organization: null,
  });

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setState({ user: null, loading: false, orgId: null, portalRole: null, organization: null });
        return;
      }
      const data = await res.json();
      setState({
        user: data.user,
        loading: false,
        orgId: data.orgId,
        portalRole: data.portalRole,
        organization: data.organization,
      });
    } catch {
      setState({ user: null, loading: false, orgId: null, portalRole: null, organization: null });
    }
  }, []);

  useEffect(() => {
    fetchMe();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchMe();
    });

    return () => subscription.unsubscribe();
  }, [fetchMe]);

  return state;
}
