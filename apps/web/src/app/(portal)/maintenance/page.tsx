"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  type: "preventive" | "corrective" | "predictive";
  performed_date: string;
  description: string | null;
  technician: string | null;
  cost: number | null;
  status: "completed" | "in_progress" | "scheduled";
  equipment: { name: string; serial_number: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  preventive: "Preventiva",
  corrective: "Corretiva",
  predictive: "Preditiva",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluida",
  in_progress: "Em andamento",
  scheduled: "Agendada",
};

const TYPE_COLORS: Record<string, string> = {
  preventive: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  corrective: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  predictive: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  scheduled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatCurrency(value: number | null) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [total, setTotal] = useState(0);

  const [filterEquipment, setFilterEquipment] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [form, setForm] = useState({
    equipment_id: "",
    type: "preventive" as string,
    performed_date: new Date().toISOString().split("T")[0],
    description: "",
    technician: "",
    cost: "",
    status: "completed" as string,
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterEquipment && filterEquipment !== "all") params.set("equipment_id", filterEquipment);
      if (filterType && filterType !== "all") params.set("type", filterType);
      if (filterStatus && filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/maintenance?${params}`);
      const json = await res.json();
      if (res.ok) {
        setRecords(json.data);
        setTotal(json.total);
      } else {
        toast.error(json.error || "Erro ao carregar registros");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setLoading(false);
    }
  }, [filterEquipment, filterType, filterStatus]);

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
    fetchRecords();
  }, [fetchRecords]);

  function openCreateDialog() {
    setSelectedRecord(null);
    setForm({
      equipment_id: "",
      type: "preventive",
      performed_date: new Date().toISOString().split("T")[0],
      description: "",
      technician: "",
      cost: "",
      status: "completed",
    });
    setDialogOpen(true);
  }

  function openEditDialog(record: MaintenanceRecord) {
    setSelectedRecord(record);
    setForm({
      equipment_id: record.equipment_id,
      type: record.type,
      performed_date: record.performed_date,
      description: record.description || "",
      technician: record.technician || "",
      cost: record.cost !== null ? String(record.cost) : "",
      status: record.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.equipment_id || !form.type || !form.performed_date) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        equipment_id: form.equipment_id,
        type: form.type,
        performed_date: form.performed_date,
        description: form.description || null,
        technician: form.technician || null,
        cost: form.cost ? parseFloat(form.cost) : null,
        status: form.status,
      };

      const url = selectedRecord
        ? `/api/maintenance/${selectedRecord.id}`
        : "/api/maintenance";
      const method = selectedRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(
          selectedRecord ? "Registro atualizado" : "Registro criado"
        );
        setDialogOpen(false);
        fetchRecords();
      } else {
        toast.error(json.error || "Erro ao salvar");
      }
    } catch {
      toast.error("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRecord) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/maintenance/${selectedRecord.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Registro excluido");
        setDeleteDialogOpen(false);
        setSelectedRecord(null);
        fetchRecords();
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
          <h1 className="text-3xl font-bold tracking-tight">Manutencoes</h1>
          <p className="text-muted-foreground mt-1">
            Registre e acompanhe manutencoes preventivas e corretivas.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Manutencao
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Select value={filterEquipment} onValueChange={setFilterEquipment}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Todos equipamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos equipamentos</SelectItem>
            {equipment.map((eq) => (
              <SelectItem key={eq.id} value={eq.id}>
                {eq.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="preventive">Preventiva</SelectItem>
            <SelectItem value="corrective">Corretiva</SelectItem>
            <SelectItem value="predictive">Preditiva</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="completed">Concluida</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="scheduled">Agendada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Registros de manutencao
            {total > 0 && (
              <span className="ml-2 text-muted-foreground font-normal">
                ({total})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Wrench className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Nenhuma manutencao registrada
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Registre manutencoes preventivas e corretivas para acompanhar
                historico e proximas acoes.
              </p>
              <Button className="mt-6" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar primeira manutencao
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tecnico</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.equipment?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[record.type]}>
                        {TYPE_LABELS[record.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(record.performed_date)}</TableCell>
                    <TableCell>{record.technician || "-"}</TableCell>
                    <TableCell>{formatCurrency(record.cost)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[record.status]}>
                        {STATUS_LABELS[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRecord(record);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
            <DialogTitle>
              {selectedRecord ? "Editar Manutencao" : "Registrar Manutencao"}
            </DialogTitle>
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
                <Label>Tipo *</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventiva</SelectItem>
                    <SelectItem value="corrective">Corretiva</SelectItem>
                    <SelectItem value="predictive">Preditiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Concluida</SelectItem>
                    <SelectItem value="in_progress">Em andamento</SelectItem>
                    <SelectItem value="scheduled">Agendada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.performed_date}
                  onChange={(e) =>
                    setForm({ ...form, performed_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tecnico</Label>
              <Input
                placeholder="Nome do tecnico"
                value={form.technician}
                onChange={(e) =>
                  setForm({ ...form, technician: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                placeholder="Detalhes da manutencao..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
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
              {selectedRecord ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Tem certeza que deseja excluir este registro de manutencao? Esta
            acao nao pode ser desfeita.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
