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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!member) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const orgId = member.org_id;

    const [membersResult, equipmentResult, schedulesResult] = await Promise.all([
      supabaseAdmin
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active"),
      supabaseAdmin
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
      supabaseAdmin
        .from("maintenance_schedules")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),
    ]);

    return NextResponse.json({
      hasTeamMembers: (membersResult.count ?? 0) > 1,
      hasEquipment: (equipmentResult.count ?? 0) > 0,
      hasSchedules: (schedulesResult.count ?? 0) > 0,
      teamMembersCount: membersResult.count ?? 0,
      equipmentCount: equipmentResult.count ?? 0,
      schedulesCount: schedulesResult.count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
