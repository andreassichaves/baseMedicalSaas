import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let query = supabaseAdmin
      .from("maintenance_records")
      .select(
        "type, performed_date, technician, cost, status, description, equipment:equipment_id(name)"
      )
      .eq("org_id", member.org_id)
      .order("performed_date", { ascending: false });

    if (from) {
      query = query.gte("performed_date", from);
    }
    if (to) {
      query = query.lte("performed_date", to);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []).map((r: Record<string, unknown>) => ({
      equipment_name:
        (r.equipment as { name: string } | null)?.name || "",
      type: r.type,
      performed_date: r.performed_date,
      technician: r.technician || "",
      cost: r.cost || "",
      status: r.status,
      description: r.description || "",
    }));

    return NextResponse.json({ data: rows });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
