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
    const today = new Date().toISOString().split("T")[0];
    const startOfMonth = `${today.substring(0, 7)}-01`;
    const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split("T")[0];

    const [
      equipmentResult,
      equipmentByStatusResult,
      maintenanceThisMonthResult,
      costThisMonthResult,
      overdueResult,
      upcomingResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId),

      supabaseAdmin
        .from("equipment")
        .select("status")
        .eq("org_id", orgId),

      supabaseAdmin
        .from("maintenance_records")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("performed_date", startOfMonth)
        .lte("performed_date", today),

      supabaseAdmin
        .from("maintenance_records")
        .select("cost")
        .eq("org_id", orgId)
        .gte("performed_date", startOfMonth)
        .lte("performed_date", today),

      supabaseAdmin
        .from("maintenance_schedules")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("is_active", true)
        .lt("next_due_date", today),

      supabaseAdmin
        .from("maintenance_schedules")
        .select("*, equipment:equipment_id(name)")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .gte("next_due_date", today)
        .lte("next_due_date", sevenDaysFromNow)
        .order("next_due_date"),
    ]);

    const statusCounts = { active: 0, inactive: 0, maintenance: 0, decommissioned: 0 };
    if (equipmentByStatusResult.data) {
      for (const eq of equipmentByStatusResult.data) {
        const s = eq.status as keyof typeof statusCounts;
        if (s in statusCounts) statusCounts[s]++;
      }
    }

    const totalCost = (costThisMonthResult.data || []).reduce(
      (sum, r) => sum + (parseFloat(r.cost) || 0),
      0
    );

    return NextResponse.json({
      equipment_total: equipmentResult.count || 0,
      equipment_by_status: statusCounts,
      maintenance_this_month: maintenanceThisMonthResult.count || 0,
      maintenance_cost_this_month: totalCost,
      overdue_schedules: overdueResult.count || 0,
      upcoming_schedules: upcomingResult.data || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
