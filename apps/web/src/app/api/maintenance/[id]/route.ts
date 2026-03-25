import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .select("*, equipment:equipment_id(name, serial_number)")
      .eq("id", id)
      .eq("org_id", member.org_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (equipment_id) {
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
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (equipment_id !== undefined) updateData.equipment_id = equipment_id;
    if (type !== undefined) updateData.type = type;
    if (performed_date !== undefined) updateData.performed_date = performed_date;
    if (description !== undefined) updateData.description = description;
    if (technician !== undefined) updateData.technician = technician;
    if (cost !== undefined) updateData.cost = cost;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabaseAdmin
      .from("maintenance_records")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", orgId)
      .select("*, equipment:equipment_id(name, serial_number)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { error } = await supabaseAdmin
      .from("maintenance_records")
      .delete()
      .eq("id", id)
      .eq("org_id", member.org_id);

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
