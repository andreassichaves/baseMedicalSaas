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

    const orgId = member.org_id;
    const searchParams = request.nextUrl.searchParams;
    const equipmentId = searchParams.get("equipment_id");
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "20");

    let query = supabaseAdmin
      .from("maintenance_records")
      .select("*, equipment:equipment_id(name, serial_number)", {
        count: "exact",
      })
      .eq("org_id", orgId);

    if (equipmentId) {
      query = query.eq("equipment_id", equipmentId);
    }
    if (type) {
      query = query.eq("type", type);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, count, error } = await query
      .order("performed_date", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [], total: count || 0 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();

    const { equipment_id, type, performed_date, description, technician, cost, status } = body;

    if (!equipment_id || !type || !performed_date) {
      return NextResponse.json(
        { error: "equipment_id, type, and performed_date are required" },
        { status: 400 }
      );
    }

    const { data: equipment } = await supabaseAdmin
      .from("equipment")
      .select("id")
      .eq("id", equipment_id)
      .eq("org_id", orgId)
      .single();

    if (!equipment) {
      return NextResponse.json(
        { error: "Equipment not found in this organization" },
        { status: 404 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .insert({
        org_id: orgId,
        equipment_id,
        type,
        performed_date,
        description: description || null,
        technician: technician || null,
        cost: cost || null,
        status: status || "completed",
      })
      .select("*, equipment:equipment_id(name, serial_number)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
