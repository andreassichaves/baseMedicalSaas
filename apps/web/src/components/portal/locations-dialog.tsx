"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  address: string | null;
}

interface LocationsDialogProps {
  onUpdate?: () => void;
}

export function LocationsDialog({ onUpdate }: LocationsDialogProps) {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      if (res.ok) setLocations(await res.json());
    } catch {
      toast.error("Erro ao carregar localizacoes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchLocations();
  }, [open, fetchLocations]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), address: newAddress.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar localizacao");
        return;
      }
      setNewName("");
      setNewAddress("");
      await fetchLocations();
      onUpdate?.();
      toast.success("Localizacao criada");
    } catch {
      toast.error("Erro ao criar localizacao");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _method: "DELETE", id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao excluir localizacao");
        return;
      }
      await fetchLocations();
      onUpdate?.();
      toast.success("Localizacao excluida");
    } catch {
      toast.error("Erro ao excluir localizacao");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" type="button">
            <MapPin className="mr-2 h-4 w-4" />
            Gerenciar Localizacoes
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Localizacoes</DialogTitle>
          <DialogDescription>
            Adicione ou remova localizacoes de equipamentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            placeholder="Nome da localizacao..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={adding}
          />
          <div className="flex items-center gap-2">
            <Input
              placeholder="Endereco (opcional)..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={adding}
            />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              type="button"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma localizacao cadastrada
            </p>
          ) : (
            locations.map((loc) => (
              <div
                key={loc.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <div>
                  <span className="text-sm font-medium">{loc.name}</span>
                  {loc.address && (
                    <p className="text-xs text-muted-foreground">{loc.address}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(loc.id)}
                  disabled={deletingId === loc.id}
                  type="button"
                >
                  {deletingId === loc.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
