"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Loader2,
  UserMinus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  PORTAL_ROLE_LABELS,
  canManageUsers,
  type PortalRole,
} from "@/lib/permissions";
import { toast } from "sonner";

interface Member {
  id: string;
  org_id: string;
  user_id: string;
  portal_role: string;
  status: string;
  joined_at: string;
  email: string;
  full_name: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  invited: "Convidado",
  suspended: "Suspenso",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "active":
      return "default" as const;
    case "invited":
      return "secondary" as const;
    case "suspended":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

const ASSIGNABLE_ROLES: { value: string; label: string }[] = [
  { value: "account_admin", label: "Administrador" },
  { value: "billing_viewer", label: "Visualizador Financeiro" },
  { value: "member", label: "Membro" },
];

export default function SettingsUsersPage() {
  const { user, portalRole, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [submitting, setSubmitting] = useState(false);

  const canEdit = portalRole
    ? canManageUsers(portalRole as PortalRole)
    : false;

  const isOwner = portalRole === "account_owner";

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/members");
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      toast.error("Erro ao carregar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleInvite() {
    if (!inviteEmail || !inviteName) {
      toast.error("Preencha todos os campos");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName,
          portalRole: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao convidar usuario");
        return;
      }
      toast.success("Usuario convidado com sucesso");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      fetchMembers();
    } catch {
      toast.error("Erro ao convidar usuario");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(memberId: string, newRole: string) {
    try {
      const res = await fetch("/api/settings/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, portal_role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao atualizar papel");
        return;
      }
      toast.success("Papel atualizado com sucesso");
      fetchMembers();
    } catch {
      toast.error("Erro ao atualizar papel");
    }
  }

  async function handleToggleStatus(m: Member) {
    const newStatus = m.status === "suspended" ? "active" : "suspended";
    try {
      const res = await fetch("/api/settings/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: m.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao atualizar status");
        return;
      }
      toast.success(
        newStatus === "suspended"
          ? "Usuario suspenso com sucesso"
          : "Usuario reativado com sucesso"
      );
      fetchMembers();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  async function handleRemove() {
    if (!memberToRemove) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: memberToRemove.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao remover usuario");
        return;
      }
      toast.success("Usuario removido com sucesso");
      setRemoveOpen(false);
      setMemberToRemove(null);
      fetchMembers();
    } catch {
      toast.error("Erro ao remover usuario");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          Voce nao tem permissao para acessar esta pagina.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os usuarios da sua empresa.
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger render={<Button type="button" />}>
            <Plus className="mr-2 h-4 w-4" />
            Convidar Usuario
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar usuario</DialogTitle>
              <DialogDescription>
                Envie um convite para um novo membro da equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-name">Nome completo</Label>
                <Input
                  id="invite-name"
                  placeholder="Nome do usuario"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Papel no portal</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(val) => setInviteRole(val as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Convidar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 opacity-50" />
              <p className="text-sm">Nenhum usuario encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id;
                  const isMemberOwner = m.portal_role === "account_owner";
                  const canChangeRole = canEdit && !isMemberOwner && !isSelf;
                  const canToggleStatus = canEdit && !isMemberOwner && !isSelf;
                  const canRemove = isOwner && !isMemberOwner && !isSelf;

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.full_name || "-"}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (voce)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>
                        {canChangeRole ? (
                          <Select
                            value={m.portal_role}
                            onValueChange={(val) =>
                              handleUpdateRole(m.id, val as string)
                            }
                          >
                            <SelectTrigger size="sm" className="w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSIGNABLE_ROLES.map((r) => (
                                <SelectItem key={r.value} value={r.value}>
                                  {r.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm">
                            {PORTAL_ROLE_LABELS[
                              m.portal_role as PortalRole
                            ] || m.portal_role}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(m.status)}>
                          {STATUS_LABELS[m.status] || m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canToggleStatus && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(m)}
                              title={
                                m.status === "suspended"
                                  ? "Reativar"
                                  : "Suspender"
                              }
                            >
                              {m.status === "suspended" ? (
                                <ShieldCheck className="h-4 w-4" />
                              ) : (
                                <ShieldAlert className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMemberToRemove(m);
                                setRemoveOpen(true);
                              }}
                              title="Remover"
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover usuario</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{" "}
              <strong>{memberToRemove?.full_name || memberToRemove?.email}</strong>{" "}
              da organizacao? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRemoveOpen(false);
                setMemberToRemove(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={submitting}
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
