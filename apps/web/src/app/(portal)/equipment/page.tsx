"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoriesDialog } from "@/components/portal/categories-dialog";
import { LocationsDialog } from "@/components/portal/locations-dialog";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  serial_number: string;
  status: string;
  categories: { name: string } | null;
  locations: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  inactive: {
    label: "Inativo",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  },
  maintenance: {
    label: "Manutencao",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  decommissioned: {
    label: "Desativado",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

const PER_PAGE = 20;

export default function EquipmentPage() {
  const router = useRouter();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(PER_PAGE));
      if (categoryFilter !== "all") params.set("category_id", categoryFilter);
      if (locationFilter !== "all") params.set("location_id", locationFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/equipment?${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setEquipment(json.data);
      setTotal(json.total);
    } catch {
      toast.error("Erro ao carregar equipamentos");
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, locationFilter, statusFilter, debouncedSearch]);

  const fetchFilters = useCallback(async () => {
    const [catRes, locRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/locations"),
    ]);
    if (catRes.ok) setCategories(await catRes.json());
    if (locRes.ok) setLocations(await locRes.json());
  }, []);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, locationFilter, statusFilter, debouncedSearch]);

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/equipment/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Equipamento excluido");
      fetchEquipment();
    } catch {
      toast.error("Erro ao excluir equipamento");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE);

  function handleRefreshFilters() {
    fetchFilters();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o inventario de equipamentos da sua empresa.
          </p>
        </div>
        <Link href="/equipment/new">
          <Button type="button">
            <Plus className="mr-2 h-4 w-4" />
            Novo Equipamento
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Localizacao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas localizacoes</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="maintenance">Manutencao</SelectItem>
            <SelectItem value="decommissioned">Desativado</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou serial..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <CategoriesDialog onUpdate={handleRefreshFilters} />
        <LocationsDialog onUpdate={handleRefreshFilters} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/6 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : equipment.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Nenhum equipamento encontrado
              </h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {debouncedSearch || categoryFilter !== "all" || locationFilter !== "all" || statusFilter !== "all"
                  ? "Tente ajustar os filtros ou a busca."
                  : "Comece cadastrando seu primeiro equipamento."}
              </p>
              {!debouncedSearch && categoryFilter === "all" && locationFilter === "all" && statusFilter === "all" && (
                <Link href="/equipment/new">
                  <Button className="mt-6" type="button">
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar primeiro equipamento
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Localizacao</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((eq) => {
                  const statusInfo = STATUS_MAP[eq.status] ?? STATUS_MAP.inactive;
                  return (
                    <TableRow
                      key={eq.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/equipment/${eq.id}`)}
                    >
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {eq.serial_number || "-"}
                      </TableCell>
                      <TableCell>{eq.categories?.name || "-"}</TableCell>
                      <TableCell>{eq.locations?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleDelete(e, eq.id)}
                          disabled={deletingId === eq.id}
                          type="button"
                        >
                          {deletingId === eq.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} equipamento{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
