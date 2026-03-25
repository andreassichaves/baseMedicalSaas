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

    const { data, error } = await supabaseAdmin
      .from("equipment")
      .select(
        "name, serial_number, status, purchase_date, purchase_cost, category:category_id(name), location:location_id(name)"
      )
      .eq("org_id", member.org_id)
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data || []).map((eq: Record<string, unknown>) => ({
      name: eq.name,
      serial_number: eq.serial_number || "",
      category:
        (eq.category as { name: string } | null)?.name || "",
      location:
        (eq.location as { name: string } | null)?.name || "",
      status: eq.status,
      purchase_date: eq.purchase_date || "",
      purchase_cost: eq.purchase_cost || "",
    }));

    return NextResponse.json({ data: rows });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
