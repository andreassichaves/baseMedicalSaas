import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getOrgId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabaseAdmin
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  return member?.org_id || null;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const orgId = await getOrgId(supabase);

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("maintenance_schedules")
      .select("*, equipment:equipment_id(name, serial_number)")
      .eq("org_id", orgId)
      .order("next_due_date");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];
    const enriched = (data || []).map((s) => ({
      ...s,
      is_overdue: s.is_active && s.next_due_date < today,
    }));

    return NextResponse.json({ data: enriched });
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
    const orgId = await getOrgId(supabase);

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { equipment_id, frequency_type, frequency_value, next_due_date, alert_days_before } = body;

    if (!equipment_id || !frequency_type || !frequency_value || !next_due_date) {
      return NextResponse.json(
        { error: "equipment_id, frequency_type, frequency_value, and next_due_date are required" },
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
      .from("maintenance_schedules")
      .insert({
        org_id: orgId,
        equipment_id,
        frequency_type,
        frequency_value,
        next_due_date,
        alert_days_before: alert_days_before ?? 7,
        is_active: true,
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

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const orgId = await getOrgId(supabase);

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (fields.equipment_id !== undefined) updateData.equipment_id = fields.equipment_id;
    if (fields.frequency_type !== undefined) updateData.frequency_type = fields.frequency_type;
    if (fields.frequency_value !== undefined) updateData.frequency_value = fields.frequency_value;
    if (fields.next_due_date !== undefined) updateData.next_due_date = fields.next_due_date;
    if (fields.last_performed_date !== undefined) updateData.last_performed_date = fields.last_performed_date;
    if (fields.alert_days_before !== undefined) updateData.alert_days_before = fields.alert_days_before;
    if (fields.is_active !== undefined) updateData.is_active = fields.is_active;

    const { data, error } = await supabaseAdmin
      .from("maintenance_schedules")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId)
      .select("*, equipment:equipment_id(name, serial_number)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const orgId = await getOrgId(supabase);

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("maintenance_schedules")
      .update({ is_active: false })
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
