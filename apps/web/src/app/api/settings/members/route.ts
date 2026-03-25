import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getAuthenticatedMember(userId: string) {
  const { data: member } = await supabaseAdmin
    .from("org_members")
    .select("id, org_id, portal_role")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();
  return member;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const member = await getAuthenticatedMember(user.id);

    if (!member) {
      return NextResponse.json(
        { error: "Usuario nao pertence a nenhuma organizacao" },
        { status: 403 }
      );
    }

    const { data: members, error: membersError } = await supabaseAdmin
      .from("org_members")
      .select("*")
      .eq("org_id", member.org_id);

    if (membersError) {
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 }
      );
    }

    const enrichedMembers = await Promise.all(
      (members || []).map(async (m) => {
        const { data: userData } =
          await supabaseAdmin.auth.admin.getUserById(m.user_id);
        return {
          ...m,
          email: userData?.user?.email ?? "",
          full_name:
            userData?.user?.user_metadata?.full_name ?? "",
        };
      })
    );

    return NextResponse.json({ members: enrichedMembers });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const member = await getAuthenticatedMember(user.id);

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
        { error: "Sem permissao para convidar usuarios" },
        { status: 403 }
      );
    }

    const { email, fullName, portalRole } = await request.json();

    if (!email || !fullName || !portalRole) {
      return NextResponse.json(
        { error: "Email, nome e papel sao obrigatorios" },
        { status: 400 }
      );
    }

    const randomPassword =
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) +
      "A1!";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email ja esta cadastrado" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    const { data: newMember, error: memberError } = await supabaseAdmin
      .from("org_members")
      .insert({
        org_id: member.org_id,
        user_id: newUserId,
        portal_role: portalRole,
        status: "invited",
      })
      .select("id")
      .single();

    if (memberError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: memberError.message },
        { status: 500 }
      );
    }

    const { data: product } = await supabaseAdmin
      .from("saas_products")
      .select("id")
      .eq("slug", "equipment-inventory")
      .single();

    if (product) {
      const { data: defaultRole } = await supabaseAdmin
        .from("saas_default_roles")
        .select("id")
        .eq("saas_product_id", product.id)
        .eq("name", "operator")
        .single();

      if (defaultRole) {
        await supabaseAdmin.from("saas_access").insert({
          org_member_id: newMember.id,
          saas_product_id: product.id,
          saas_role_id: defaultRole.id,
          role_type: "default",
        });
      }
    }

    return NextResponse.json(
      { message: "Usuario convidado com sucesso" },
      { status: 201 }
    );
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

    const member = await getAuthenticatedMember(user.id);

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
        { error: "Sem permissao para atualizar membros" },
        { status: 403 }
      );
    }

    const { memberId, portal_role, status } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId e obrigatorio" },
        { status: 400 }
      );
    }

    const { data: targetMember } = await supabaseAdmin
      .from("org_members")
      .select("id, org_id, portal_role")
      .eq("id", memberId)
      .eq("org_id", member.org_id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: "Membro nao encontrado" },
        { status: 404 }
      );
    }

    if (targetMember.portal_role === "account_owner") {
      return NextResponse.json(
        { error: "Nao e possivel alterar o proprietario da conta" },
        { status: 403 }
      );
    }

    const updateData: Record<string, string> = {};
    if (portal_role) updateData.portal_role = portal_role;
    if (status) updateData.status = status;

    const { error: updateError } = await supabaseAdmin
      .from("org_members")
      .update(updateData)
      .eq("id", memberId)
      .eq("org_id", member.org_id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Membro atualizado com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const member = await getAuthenticatedMember(user.id);

    if (!member) {
      return NextResponse.json(
        { error: "Usuario nao pertence a nenhuma organizacao" },
        { status: 403 }
      );
    }

    if (member.portal_role !== "account_owner") {
      return NextResponse.json(
        { error: "Apenas o proprietario pode remover membros" },
        { status: 403 }
      );
    }

    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: "memberId e obrigatorio" },
        { status: 400 }
      );
    }

    const { data: targetMember } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id, org_id, portal_role")
      .eq("id", memberId)
      .eq("org_id", member.org_id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: "Membro nao encontrado" },
        { status: 404 }
      );
    }

    if (targetMember.user_id === user.id) {
      return NextResponse.json(
        { error: "Voce nao pode remover a si mesmo" },
        { status: 400 }
      );
    }

    if (targetMember.portal_role === "account_owner") {
      return NextResponse.json(
        { error: "Nao e possivel remover o proprietario da conta" },
        { status: 403 }
      );
    }

    await supabaseAdmin
      .from("saas_access")
      .delete()
      .eq("org_member_id", memberId);

    const { error: deleteError } = await supabaseAdmin
      .from("org_members")
      .delete()
      .eq("id", memberId)
      .eq("org_id", member.org_id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Membro removido com sucesso" });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
