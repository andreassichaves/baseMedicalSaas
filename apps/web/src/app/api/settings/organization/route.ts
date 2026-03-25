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
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Usuario nao pertence a nenhuma organizacao" },
        { status: 403 }
      );
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("name, slug, subscription_status, plan, trial_ends_at")
      .eq("id", member.org_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organizacao nao encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization: org });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("org_id, portal_role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "Usuario nao pertence a nenhuma organizacao" },
        { status: 403 }
      );
    }

    if (
      member.portal_role !== "account_owner" &&
      member.portal_role !== "account_admin"
    ) {
      return NextResponse.json(
        { error: "Sem permissao para atualizar a organizacao" },
        { status: 403 }
      );
    }

    const { name, slug } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nome e slug sao obrigatorios" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update({ name, slug, updated_at: new Date().toISOString() })
      .eq("id", member.org_id)
      .select("name, slug, subscription_status, plan, trial_ends_at")
      .single();

    if (updateError) {
      if (updateError.message.includes("duplicate") || updateError.message.includes("unique")) {
        return NextResponse.json(
          { error: "Este slug ja esta em uso" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ organization: updated });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
