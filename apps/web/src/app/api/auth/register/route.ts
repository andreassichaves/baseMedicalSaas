import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, password, fullName, companyName, slug } =
      await request.json();

    if (!email || !password || !fullName || !companyName || !slug) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email já está cadastrado. Faça login." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({ name: companyName, slug })
      .select("id")
      .single();

    if (orgError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Erro ao criar empresa: ${orgError.message}` },
        { status: 500 }
      );
    }

    const { data: newMember, error: memberError } = await supabaseAdmin
      .from("org_members")
      .insert({
        org_id: org.id,
        user_id: userId,
        portal_role: "account_owner",
        status: "active",
      })
      .select("id")
      .single();

    if (memberError || !newMember) {
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: `Erro ao vincular usuario: ${memberError?.message}` },
        { status: 500 }
      );
    }

    const { data: product } = await supabaseAdmin
      .from("saas_products")
      .select("id")
      .eq("slug", "equipment-inventory")
      .single();

    if (product) {
      const { data: saasAdminRole } = await supabaseAdmin
        .from("saas_default_roles")
        .select("id")
        .eq("saas_product_id", product.id)
        .eq("name", "saas_admin")
        .single();

      if (saasAdminRole) {
        await supabaseAdmin.from("saas_access").insert({
          org_member_id: newMember.id,
          saas_product_id: product.id,
          saas_role_id: saasAdminRole.id,
          role_type: "default",
        });
      }
    }

    return NextResponse.json(
      { message: "Conta criada com sucesso!", userId, orgId: org.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
