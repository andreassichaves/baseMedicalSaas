"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  FileHeart,
  BarChart3,
  ArrowRight,
  Clock,
  Wrench,
  DollarSign,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingChecklist } from "@/components/portal/onboarding-checklist";

interface DashboardStats {
  equipment_total: number;
  equipment_by_status: {
    active: number;
    inactive: number;
    maintenance: number;
    decommissioned: number;
  };
  maintenance_this_month: number;
  maintenance_cost_this_month: number;
  overdue_schedules: number;
  upcoming_schedules: {
    id: string;
    next_due_date: string;
    equipment: { name: string } | null;
  }[];
}

const products = [
  {
    name: "Inventario de Equipamentos",
    slug: "equipment-inventory",
    description:
      "Gerencie seus equipamentos e manutencoes preventivas e corretivas.",
    icon: Package,
    isActive: true,
    href: "/equipment",
  },
  {
    name: "Prontuario Eletronico",
    slug: "electronic-health-record",
    description: "Gestao completa de prontuarios de pacientes.",
    icon: FileHeart,
    isActive: false,
    isComingSoon: true,
    href: "#",
  },
  {
    name: "Inteligencia de Dados",
    slug: "data-intelligence",
    description: "Dashboards e analises avancadas dos seus dados.",
    icon: BarChart3,
    isActive: false,
    isComingSoon: true,
    href: "#",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function DashboardPage() {
  const { organization, loading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      const json = await res.json();
      if (res.ok) setStats(json);
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao Portal SaaS
          {organization ? ` — ${organization.name}` : ""}
        </p>
      </div>

      {organization?.subscription_status === "trialing" && organization.trial_ends_at && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Periodo de teste ativo —{" "}
                {Math.max(0, Math.ceil((new Date(organization.trial_ends_at).getTime() - Date.now()) / 86400000))}{" "}
                dias restantes
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Aproveite o acesso completo a todos os recursos.
              </p>
            </div>
            <Link href="/settings/billing" className={cn(buttonVariants({ size: "sm" }))}>
              Assinar agora
            </Link>
          </CardContent>
        </Card>
      )}

      {!statsLoading && stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Equipamentos
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.equipment_total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.equipment_by_status.active} ativos,{" "}
                  {stats.equipment_by_status.maintenance} em manutencao
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Manutencoes este Mes
                </CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.maintenance_this_month}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  registros neste mes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Custo Total Mes
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats.maintenance_cost_this_month)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  em manutencoes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Alertas Vencidos
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  stats.overdue_schedules > 0 && "text-red-600"
                )}>
                  {stats.overdue_schedules}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  agendamentos vencidos
                </p>
              </CardContent>
            </Card>
          </div>

          {stats.upcoming_schedules.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" />
                  Proximas Manutencoes
                </CardTitle>
                <Link
                  href="/maintenance/schedules"
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Ver todos
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.upcoming_schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                          <Wrench className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {schedule.equipment?.name || "Equipamento"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {formatDate(schedule.next_due_date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {formatDate(schedule.next_due_date)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <OnboardingChecklist />

      <div>
        <h2 className="text-lg font-semibold mb-4">Produtos disponiveis</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.slug}
              className={
                product.isActive
                  ? "transition-shadow hover:shadow-md"
                  : "opacity-75"
              }
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <product.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{product.name}</CardTitle>
                </div>
                {product.isComingSoon && (
                  <Badge variant="secondary">Em breve</Badge>
                )}
                {product.isActive && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Ativo
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {product.description}
                </p>
                {product.isActive ? (
                  <Link href={product.href} className={cn(buttonVariants(), "w-full")}>
                    Acessar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Disponivel em breve
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
