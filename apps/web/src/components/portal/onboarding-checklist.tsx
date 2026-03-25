"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  CalendarClock,
  CheckCircle2,
  Circle,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OnboardingStatus {
  hasTeamMembers: boolean;
  hasEquipment: boolean;
  hasSchedules: boolean;
  teamMembersCount: number;
  equipmentCount: number;
  schedulesCount: number;
}

const checklistItems = [
  {
    key: "hasTeamMembers" as const,
    label: "Convide sua equipe",
    description: "Adicione membros e defina permissoes de acesso.",
    href: "/settings/users",
    icon: Users,
  },
  {
    key: "hasEquipment" as const,
    label: "Cadastre o primeiro equipamento",
    description: "Registre os equipamentos que deseja gerenciar.",
    href: "/equipment",
    icon: Package,
  },
  {
    key: "hasSchedules" as const,
    label: "Configure manutencoes recorrentes",
    description: "Agende manutencoes preventivas para seus equipamentos.",
    href: "/maintenance/schedules",
    icon: CalendarClock,
  },
];

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("onboarding-dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
      setLoading(false);
      return;
    }

    async function fetchStatus() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  if (loading || dismissed || !status) return null;

  const completedCount = checklistItems.filter(
    (item) => status[item.key]
  ).length;
  const totalCount = checklistItems.length;
  const allComplete = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  if (allComplete) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Rocket className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
              Tudo pronto!
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Sua empresa esta configurada. Bom trabalho!
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("onboarding-dismissed", "true");
              setDismissed(true);
            }}
            className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 underline"
          >
            Fechar
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Primeiros passos
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} concluidos
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {checklistItems.map((item) => {
          const done = status[item.key];
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
                done
                  ? "opacity-60"
                  : "hover:bg-accent"
              )}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    done && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              {!done && (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
