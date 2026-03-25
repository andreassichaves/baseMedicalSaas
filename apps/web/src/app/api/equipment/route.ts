import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const createEquipmentSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  serial_number: z.string().optional().default(""),
  category_id: z.string().uuid().optional().nullable(),
  location_id: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "inactive", "maintenance", "decommissioned"]).default("active"),
  description: z.string().optional().default(""),
  purchase_date: z.string().optional().nullable(),
  purchase_cost: z.number().optional().nullable(),
  photo_url: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
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
    const orgId = member.org_id;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("category_id");
    const locationId = searchParams.get("location_id");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "20", 10)));

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabaseAdmin
      .from("equipment")
      .select("*, categories(name), locations(name)", { count: "exact" })
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (categoryId) query = query.eq("category_id", categoryId);
    if (locationId) query = query.eq("location_id", locationId);
    if (status) query = query.eq("status", status);
    if (search) {
      query = query.or(`name.ilike.%${search}%,serial_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      per_page: perPage,
    });
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
    const orgId = member.org_id;

    const body = await request.json();
    const parsed = createEquipmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados invalidos" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("equipment")
      .insert({
        ...parsed.data,
        org_id: orgId,
        category_id: parsed.data.category_id || null,
        location_id: parsed.data.location_id || null,
        purchase_cost: parsed.data.purchase_cost || null,
        purchase_date: parsed.data.purchase_date || null,
      })
      .select("*, categories(name), locations(name)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
