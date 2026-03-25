"use client";

import { useEffect, useState } from "react";
import { Settings, Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { canManageUsers } from "@/lib/permissions";
import type { PortalRole } from "@/lib/permissions";
import { toast } from "sonner";

interface OrgData {
  name: string;
  slug: string;
  subscription_status: string;
  plan: string;
  trial_ends_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  trialing: "Trial",
  active: "Ativo",
  past_due: "Pagamento pendente",
  canceled: "Cancelado",
  unpaid: "Nao pago",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

function getStatusVariant(status: string) {
  switch (status) {
    case "active":
      return "default" as const;
    case "trialing":
      return "secondary" as const;
    case "past_due":
    case "canceled":
    case "unpaid":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export default function CompanySettingsPage() {
  const { portalRole, loading: authLoading } = useAuth();
  const [org, setOrg] = useState<OrgData | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = portalRole
    ? canManageUsers(portalRole as PortalRole)
    : false;

  useEffect(() => {
    async function fetchOrg() {
      try {
        const res = await fetch("/api/settings/organization");
        if (!res.ok) return;
        const data = await res.json();
        setOrg(data.organization);
        setName(data.organization.name);
      } catch {
        toast.error("Erro ao carregar dados da empresa");
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, []);

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: org.slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erro ao salvar");
        return;
      }
      setOrg(data.organization);
      toast.success("Dados da empresa atualizados com sucesso");
    } catch {
      toast.error("Erro ao salvar dados da empresa");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">
          Nao foi possivel carregar os dados da empresa.
        </p>
      </div>
    );
  }

  const trialEndDate = org.trial_ends_at
    ? new Date(org.trial_ends_at)
    : null;
  const isTrialing = org.subscription_status === "trialing";
  const daysLeft =
    trialEndDate
      ? Math.max(
          0,
          Math.ceil(
            (trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuracoes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as configuracoes da sua empresa.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da empresa</Label>
              <Input
                id="company-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-slug">Slug</Label>
              <Input id="company-slug" value={org.slug} disabled />
              <p className="text-xs text-muted-foreground">
                O slug nao pode ser alterado.
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || name === org.name}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Plano
              </p>
              <p className="text-sm font-semibold">
                {PLAN_LABELS[org.plan] || org.plan}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Status
              </p>
              <Badge variant={getStatusVariant(org.subscription_status)}>
                {STATUS_LABELS[org.subscription_status] ||
                  org.subscription_status}
              </Badge>
            </div>
          </div>

          {isTrialing && trialEndDate && (
            <>
              <Separator />
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Periodo de avaliacao
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Seu trial termina em{" "}
                  <strong>{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</strong>{" "}
                  ({trialEndDate.toLocaleDateString("pt-BR")}).
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
