import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id, portal_role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    const org = member
      ? await supabaseAdmin
          .from("organizations")
          .select("id, name, slug, subscription_status, plan, trial_ends_at")
          .eq("id", member.org_id)
          .single()
          .then((r) => r.data)
      : null;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name ?? null,
      },
      orgId: member?.org_id ?? null,
      portalRole: member?.portal_role ?? null,
      organization: org,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 }
    );
  }
}
