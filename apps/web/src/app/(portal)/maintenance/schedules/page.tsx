"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  serial_number: string;
}

interface Schedule {
  id: string;
  equipment_id: string;
  frequency_type: "days" | "weeks" | "months";
  frequency_value: number;
  next_due_date: string;
  last_performed_date: string | null;
  alert_days_before: number;
  is_active: boolean;
  is_overdue: boolean;
  equipment: { name: string; serial_number: string } | null;
}

const FREQ_LABELS: Record<string, string> = {
  days: "dia(s)",
  weeks: "semana(s)",
  months: "mes(es)",
};

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function MaintenanceSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  const [form, setForm] = useState({
    equipment_id: "",
    frequency_type: "months" as string,
    frequency_value: "1",
    next_due_date: "",
    alert_days_before: "7",
  });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/maintenance/schedules");
      const json = await res.json();
      if (res.ok) {
        setSchedules(json.data);
      } else {
        toast.error(json.error || "Erro ao carregar agendamentos");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await fetch("/api/equipment");
      const json = await res.json();
      if (res.ok) setEquipment(json.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  function openCreateDialog() {
    setSelectedSchedule(null);
    setForm({
      equipment_id: "",
      frequency_type: "months",
      frequency_value: "1",
      next_due_date: "",
      alert_days_before: "7",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.equipment_id || !form.frequency_type || !form.frequency_value || !form.next_due_date) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        equipment_id: form.equipment_id,
        frequency_type: form.frequency_type,
        frequency_value: parseInt(form.frequency_value),
        next_due_date: form.next_due_date,
        alert_days_before: parseInt(form.alert_days_before) || 7,
      };

      const res = await fetch("/api/maintenance/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Agendamento criado");
        setDialogOpen(false);
        fetchSchedules();
      } else {
        toast.error(json.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(schedule: Schedule) {
    try {
      const res = await fetch("/api/maintenance/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: schedule.id, is_active: !schedule.is_active }),
      });
      if (res.ok) {
        toast.success(
          schedule.is_active ? "Agendamento desativado" : "Agendamento ativado"
        );
        fetchSchedules();
      } else {
        const json = await res.json();
        toast.error(json.error || "Erro ao atualizar");
      }
    } catch {
      toast.error("Erro de conexao");
    }
  }

  async function handleDelete() {
    if (!selectedSchedule) return;
    setSaving(true);
    try {
      const res = await fetch("/api/maintenance/schedules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedSchedule.id }),
      });
      if (res.ok) {
        toast.success("Agendamento desativado");
        setDeleteDialogOpen(false);
        setSelectedSchedule(null);
        fetchSchedules();
      } else {
        const json = await res.json();
        toast.error(json.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agendamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie agendamentos de manutencoes recorrentes.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <CalendarClock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Nenhum agendamento criado
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Crie um agendamento para planejar manutencoes recorrentes nos
                seus equipamentos.
              </p>
              <Button className="mt-6" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Criar primeiro agendamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Frequencia</TableHead>
                  <TableHead>Proxima Data</TableHead>
                  <TableHead>Ultima Realizada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow
                    key={schedule.id}
                    className={
                      schedule.is_overdue
                        ? "bg-red-50 dark:bg-red-950/30"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      {schedule.equipment?.name || "-"}
                    </TableCell>
                    <TableCell>
                      A cada {schedule.frequency_value}{" "}
                      {FREQ_LABELS[schedule.frequency_type]}
                    </TableCell>
                    <TableCell
                      className={
                        schedule.is_overdue
                          ? "text-red-600 font-semibold"
                          : undefined
                      }
                    >
                      {formatDate(schedule.next_due_date)}
                      {schedule.is_overdue && (
                        <Badge className="ml-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Vencido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(schedule.last_performed_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => handleToggleActive(schedule)}
                        />
                        <span className="text-sm">
                          {schedule.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Equipamento *</Label>
              <Select
                value={form.equipment_id}
                onValueChange={(v) => setForm({ ...form, equipment_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o equipamento" />
                </SelectTrigger>
                <SelectContent>
                  {equipment.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}
                      {eq.serial_number ? ` (${eq.serial_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de frequencia *</Label>
                <Select
                  value={form.frequency_type}
                  onValueChange={(v) =>
                    setForm({ ...form, frequency_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Dias</SelectItem>
                    <SelectItem value="weeks">Semanas</SelectItem>
                    <SelectItem value="months">Meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor da frequencia *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.frequency_value}
                  onChange={(e) =>
                    setForm({ ...form, frequency_value: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proxima data *</Label>
                <Input
                  type="date"
                  value={form.next_due_date}
                  onChange={(e) =>
                    setForm({ ...form, next_due_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Dias de alerta</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.alert_days_before}
                  onChange={(e) =>
                    setForm({ ...form, alert_days_before: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar desativacao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Tem certeza que deseja desativar este agendamento? O agendamento
            sera marcado como inativo.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
