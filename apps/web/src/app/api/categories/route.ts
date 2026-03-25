import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("org_id", member.org_id)
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();
    if (!member) return NextResponse.json({ error: "No organization" }, { status: 404 });

    const body = await request.json();

    if (body._method === "DELETE") {
      if (!body.id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from("categories")
        .delete()
        .eq("id", body.id)
        .eq("org_id", member.org_id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome e obrigatorio" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("categories")
      .insert({ name: body.name.trim(), org_id: member.org_id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
