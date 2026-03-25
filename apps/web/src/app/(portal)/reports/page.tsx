"use client";

import { useState } from "react";
import {
  BarChart3,
  FileText,
  DollarSign,
  AlertTriangle,
  Download,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function objectsToCsv(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const val = String(row[h] ?? "");
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [loadingOverdue, setLoadingOverdue] = useState(false);

  const [maintenanceFrom, setMaintenanceFrom] = useState("");
  const [maintenanceTo, setMaintenanceTo] = useState("");
  const [costsFrom, setCostsFrom] = useState("");
  const [costsTo, setCostsTo] = useState("");

  async function handleEquipmentExport() {
    setLoadingEquipment(true);
    try {
      const res = await fetch("/api/reports/equipment");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.data.length === 0) {
        toast.info("Nenhum equipamento encontrado");
        return;
      }
      const csv = objectsToCsv(json.data);
      downloadCsv(csv, "inventario-equipamentos.csv");
      toast.success("Relatorio exportado");
    } catch {
      toast.error("Erro ao exportar relatorio");
    } finally {
      setLoadingEquipment(false);
    }
  }

  async function handleMaintenanceExport() {
    setLoadingMaintenance(true);
    try {
      const params = new URLSearchParams();
      if (maintenanceFrom) params.set("from", maintenanceFrom);
      if (maintenanceTo) params.set("to", maintenanceTo);
      const res = await fetch(`/api/reports/maintenance?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.data.length === 0) {
        toast.info("Nenhum registro encontrado no periodo");
        return;
      }
      const csv = objectsToCsv(json.data);
      downloadCsv(csv, "historico-manutencoes.csv");
      toast.success("Relatorio exportado");
    } catch {
      toast.error("Erro ao exportar relatorio");
    } finally {
      setLoadingMaintenance(false);
    }
  }

  async function handleCostsExport() {
    setLoadingCosts(true);
    try {
      const params = new URLSearchParams();
      if (costsFrom) params.set("from", costsFrom);
      if (costsTo) params.set("to", costsTo);
      const res = await fetch(`/api/reports/maintenance?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.data.length === 0) {
        toast.info("Nenhum registro encontrado no periodo");
        return;
      }
      const costData = json.data.filter(
        (r: Record<string, unknown>) => r.cost && Number(r.cost) > 0
      );
      if (costData.length === 0) {
        toast.info("Nenhum registro com custo no periodo");
        return;
      }
      const csv = objectsToCsv(costData);
      downloadCsv(csv, "custos-manutencao.csv");
      toast.success("Relatorio exportado");
    } catch {
      toast.error("Erro ao exportar relatorio");
    } finally {
      setLoadingCosts(false);
    }
  }

  async function handleOverdueExport() {
    setLoadingOverdue(true);
    try {
      const res = await fetch("/api/maintenance/schedules");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const overdue = (json.data || []).filter(
        (s: { is_overdue: boolean }) => s.is_overdue
      );
      if (overdue.length === 0) {
        toast.info("Nenhum agendamento vencido encontrado");
        return;
      }
      const rows = overdue.map(
        (s: {
          equipment: { name: string } | null;
          frequency_value: number;
          frequency_type: string;
          next_due_date: string;
          last_performed_date: string | null;
        }) => ({
          equipamento: s.equipment?.name || "",
          frequencia: `${s.frequency_value} ${s.frequency_type}`,
          proxima_data: s.next_due_date,
          ultima_realizada: s.last_performed_date || "",
        })
      );
      const csv = objectsToCsv(rows);
      downloadCsv(csv, "equipamentos-sem-manutencao.csv");
      toast.success("Relatorio exportado");
    } catch {
      toast.error("Erro ao exportar relatorio");
    } finally {
      setLoadingOverdue(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatorios</h1>
        <p className="text-muted-foreground mt-1">
          Visualize e exporte relatorios do seu inventario.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base leading-tight">
              Inventario Completo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Lista completa de equipamentos com status, localizacao e dados
              cadastrais.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleEquipmentExport}
              disabled={loadingEquipment}
            >
              {loadingEquipment ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base leading-tight">
              Historico de Manutencoes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Linha do tempo de manutencoes preventivas e corretivas por
              equipamento.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input
                  type="date"
                  value={maintenanceFrom}
                  onChange={(e) => setMaintenanceFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ate</Label>
                <Input
                  type="date"
                  value={maintenanceTo}
                  onChange={(e) => setMaintenanceTo(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleMaintenanceExport}
              disabled={loadingMaintenance}
            >
              {loadingMaintenance ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base leading-tight">
              Custos por Periodo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Agregacao de custos de manutencao e pecas por mes ou trimestre.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input
                  type="date"
                  value={costsFrom}
                  onChange={(e) => setCostsFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ate</Label>
                <Input
                  type="date"
                  value={costsTo}
                  onChange={(e) => setCostsTo(e.target.value)}
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCostsExport}
              disabled={loadingCosts}
            >
              {loadingCosts ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <AlertTriangle className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base leading-tight">
              Equipamentos sem Manutencao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Equipamentos sem registro recente de manutencao ou fora do plano.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleOverdueExport}
              disabled={loadingOverdue}
            >
              {loadingOverdue ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
