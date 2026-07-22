"use client";

import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoleLabel, ROLE_OPTIONS } from "@/lib/role-labels";
import { getTripStatusColorClassName, getTripStatusLabel, TRIP_STATUS_OPTIONS } from "@/lib/trip-status-labels";
import { cn } from "@/lib/utils";

const emptyForm: Record<string, unknown> = {};

export type EntityKind = "users" | "trips" | "work-orders" | "customers" | "machineries" | "inventory";

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type CustomerOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
};

type MachineryOption = {
  id: string;
  name: string;
  type?: string | null;
  brand?: string | null;
  identifier?: string | null;
  active: boolean;
};

type InventoryItemOption = {
  id: string;
  name: string;
  type: "FUEL" | "CHEMICAL" | "AGRO";
  unit: string;
  quantity: number;
  minQuantity: number;
  active: boolean;
};

const UNIT_OPTIONS = ["L", "KG", "G", "ML", "M3"] as const;

type ChemicalLine = {
  inventoryItemId: string;
  product: string;
  quantity: string;
  unit: string;
};

type FilterState = {
  search: string;
  status: string;
  type: string;
  date: string;
};

interface EntityManagerProps {
  kind: EntityKind;
}

export function EntityManager({ kind }: EntityManagerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [machineries, setMachineries] = useState<MachineryOption[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ search: "", status: "", type: "", date: "" });
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadItems = useCallback(async (currentFilters: FilterState = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (currentFilters.search.trim()) {
        params.set("search", currentFilters.search.trim());
      }

      if (currentFilters.status) {
        params.set("status", currentFilters.status);
      }

      if (currentFilters.type) {
        params.set("type", currentFilters.type);
      }

      if (currentFilters.date) {
        params.set("date", currentFilters.date);
      }

      const query = params.toString();
      const response = await fetch(`/api/admin/${kind}${query ? `?${query}` : ""}`);
      if (response.ok) {
        setItems(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }, [filters, kind]);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch {
      setUsers([]);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/customers");
      if (response.ok) {
        setCustomers(await response.json());
      }
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadMachineries = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/machineries");
      if (response.ok) {
        setMachineries(await response.json());
      }
    } catch {
      setMachineries([]);
    }
  }, []);

  const loadInventoryItems = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/inventory");
      if (response.ok) {
        setInventoryItems(await response.json());
      }
    } catch {
      setInventoryItems([]);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadCustomers();
    void loadMachineries();
    void loadInventoryItems();
  }, [loadUsers, loadCustomers, loadMachineries, loadInventoryItems]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void loadItems(filters);
  }, [filters, loadItems]);

  useEffect(() => {
    setEditingId(null);
    setForm(getInitialForm(kind));
    setFilters({ search: "", status: "", type: "", date: "" });
    setMessage(null);
    setIsFormOpen(false);
  }, [kind]);

  const resetForm = ({ preserveMessage = false }: { preserveMessage?: boolean } = {}) => {
    setEditingId(null);
    setForm(getInitialForm(kind));
    if (!preserveMessage) {
      setMessage(null);
    }
  };

  const toggleCreateForm = () => {
    if (isFormOpen) {
      resetForm();
      setIsFormOpen(false);
      return;
    }

    setEditingId(null);
    setForm(getInitialForm(kind));
    setMessage(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationMessage = validateForm(kind, form);
    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const url = editingId ? `/api/admin/${kind}/${editingId}` : `/api/admin/${kind}`;
    const method = editingId ? "PATCH" : "POST";
    const payload = buildPayload(kind, form, { customers, machineries, inventoryItems });

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setMessage({ type: "error", text: errorData?.error ?? "No se pudo guardar el registro" });
        return;
      }

      setMessage({ type: "success", text: editingId ? "Registro actualizado correctamente" : "Registro creado correctamente" });
      resetForm({ preserveMessage: true });
      setIsFormOpen(false);
      await loadItems(filters);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm(buildFormState(kind, item));
    setMessage(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que querés eliminar este registro?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/${kind}/${id}`, { method: "DELETE" });
      if (response.ok) {
        setMessage({ type: "success", text: "Registro eliminado correctamente" });
        await loadItems(filters);
      } else {
        setMessage({ type: "error", text: "No se pudo eliminar el registro" });
      }
    } catch {
      setMessage({ type: "error", text: "No se pudo eliminar el registro" });
    }
  };

  const handleRestock = async (id: string) => {
    const amount = Number(prompt("Cantidad a reabastecer"));
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Cantidad de reabastecimiento inválida" });
      return;
    }

    try {
      const response = await fetch(`/api/admin/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restockAmount: amount })
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Producto reabastecido correctamente" });
        await loadItems(filters);
      } else {
        const errorData = await response.json().catch(() => null);
        setMessage({ type: "error", text: errorData?.error ?? "No se pudo reabastecer el producto" });
      }
    } catch {
      setMessage({ type: "error", text: "No se pudo reabastecer el producto" });
    }
  };

  const driverOptions = users.filter((user) => user.role === "DRIVER");
  const operatorOptions = users.filter((user) => user.role === "MACHINE_OPERATOR");
  const customerOptions = customers.filter((customer) => customer.active !== false);
  const machineryOptions = machineries.filter((machinery) => machinery.active !== false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={toggleCreateForm}
          aria-expanded={isFormOpen}
          className="w-full sm:w-auto"
        >
          {getCreateButtonLabel(kind)}
        </Button>
      </div>
      {message ? (
        <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => { resetForm(); setIsFormOpen(false); }}>
          <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <h3 className="text-base font-black">{editingId ? getEditFormTitle(kind) : getCreateButtonLabel(kind)}</h3>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => resetForm()} className="w-full sm:w-auto">Limpiar</Button>
                <Button type="button" variant="outline" onClick={() => { resetForm(); setIsFormOpen(false); }} className="w-full sm:w-auto">Cancelar</Button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {renderFields(kind, form, setForm, { driverOptions, operatorOptions, customerOptions, machineryOptions, inventoryItems })}
                <div className="sm:col-span-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => { resetForm(); setIsFormOpen(false); }} className="w-full sm:w-auto">Cancelar</Button>
                  <Button type="submit" disabled={submitting} className="w-full sm:w-auto">{submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <Label htmlFor="search-filter">Buscar</Label>
            <Input
              id="search-filter"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder={kind === "trips" ? "Patente, conductor, producto" : kind === "work-orders" ? "Maquinaria, operador, lote" : kind === "customers" ? "Cliente, email o teléfono" : kind === "machineries" ? "Maquinaria, tipo o marca" : "Buscar"}
            />
          </div>
          {kind !== "work-orders" ? (
            <div className="w-full lg:w-48">
              <Label htmlFor="status-filter">{kind === "users" ? "Rol" : "Estado"}</Label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
              >
                <option value="">{kind === "users" ? "Todos los roles" : "Todos"}</option>
                {getStatusOptions(kind).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          ) : null}
          {kind === "inventory" ? (
            <div className="w-full lg:w-48">
              <Label htmlFor="type-filter">Tipo</Label>
              <select
                id="type-filter"
                value={filters.type}
                onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
                className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
              >
                <option value="">Todos los tipos</option>
                <option value="FUEL">Combustible</option>
                <option value="CHEMICAL">Químico</option>
                <option value="AGRO">Agro</option>
              </select>
            </div>
          ) : null}
          {kind !== "users" && kind !== "customers" && kind !== "machineries" ? (
            <div className="w-full lg:w-48">
              <Label htmlFor="date-filter">Fecha</Label>
              <Input id="date-filter" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
            </div>
          ) : null}
          <Button type="button" variant="outline" onClick={() => setFilters({ search: "", status: "", type: "", date: "" })} className="w-full sm:w-auto">Limpiar</Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Cargando...</p>
        ) : (
          <div>
            <div className="space-y-3 sm:hidden">
              {kind === "users" ? (
                items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{item.name}</p>
                        <p className="text-sm text-slate-600">{item.email}</p>
                      </div>
                      <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-black">{getRoleLabel(item.role)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => handleEdit(item)} className="flex-1">Editar</Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)} className="flex-1">Borrar</Button>
                    </div>
                  </div>
                ))
              ) : null}

              {kind === "trips" ? (
                items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{item.licensePlate}</p>
                        <p className="text-sm text-slate-600">{item.driverName}</p>
                      </div>
                      <span className={cn("inline-flex h-7 items-center rounded-sm border px-2 text-xs font-black", getTripStatusColorClassName(item.status))}>
                        {getTripStatusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.product}</p>
                    <p className="text-sm text-slate-600">{item.origin} → {item.destination}</p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => handleEdit(item)} className="flex-1">Editar</Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)} className="flex-1">Borrar</Button>
                    </div>
                  </div>
                ))
              ) : null}


              {kind === "work-orders" ? (
                items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{item.machinery}</p>
                        <p className="text-sm text-slate-600">{item.operatorName}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.plot} · {item.customer}</p>
                    <p className="text-sm text-slate-600">Ha {item.hectaresWorked} · {item.fuelLiters} L</p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => handleEdit(item)} className="flex-1">Editar</Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)} className="flex-1">Borrar</Button>
                    </div>
                  </div>
                ))
              ) : null}

              {kind === "customers" ? (
                items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{item.name}</p>
                        <p className="text-sm text-slate-600">{item.email ?? "Sin email"}</p>
                      </div>
                      <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-black">{item.active ? "Activo" : "Inactivo"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.phone ?? "Sin teléfono"}</p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => handleEdit(item)} className="flex-1">Editar</Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)} className="flex-1">Borrar</Button>
                    </div>
                  </div>
                ))
              ) : null}

              {kind === "machineries" ? (
                items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{item.name}</p>
                        <p className="text-sm text-slate-600">{item.type ?? "Sin tipo"}</p>
                      </div>
                      <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-black">{item.active ? "Activo" : "Inactivo"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.brand ?? "Sin marca"} · {item.identifier ?? "Sin identificador"}</p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => handleEdit(item)} className="flex-1">Editar</Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)} className="flex-1">Borrar</Button>
                    </div>
                  </div>
                ))
              ) : null}

              {kind === "inventory" ? (
                items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{item.name}</p>
                        <p className="text-sm text-slate-600">{item.type} · {item.unit}</p>
                      </div>
                      <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-black">{item.active ? "Activo" : "Inactivo"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.quantity} / mínimo {item.minQuantity}</p>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" variant="outline" onClick={() => handleEdit(item)} className="flex-1">Editar</Button>
                      <Button type="button" variant="success" onClick={() => handleRestock(item.id)} className="flex-1">Reabastecer</Button>
                      <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)} className="flex-1">Borrar</Button>
                    </div>
                  </div>
                ))
              ) : null}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              {kind === "users" ? (
                <table className="w-full table-auto text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Rol</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3 font-bold">{item.name}</td>
                        <td className="py-2 pr-3">{item.email}</td>
                        <td className="py-2 pr-3">{getRoleLabel(item.role)}</td>
                        <td className="py-2 pr-3 w-1 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
                            <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {kind === "trips" ? (
                <table className="w-full table-auto text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Patente</th>
                      <th className="py-2 pr-3">Conductor</th>
                      <th className="py-2 pr-3">Producto</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Origen / Destino</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3 font-bold">{item.licensePlate}</td>
                        <td className="py-2 pr-3">{item.driverName}</td>
                        <td className="py-2 pr-3">{item.product}</td>
                        <td className="py-2 pr-3">
                          <span className={cn("inline-flex h-7 items-center rounded-sm border px-2 text-xs font-black", getTripStatusColorClassName(item.status))}>
                            {getTripStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{item.origin} a {item.destination}</td>
                        <td className="py-2 pr-3 w-1 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
                            <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {kind === "work-orders" ? (
                <table className="w-full table-auto text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Maquinaria</th>
                      <th className="py-2 pr-3">Operador</th>
                      <th className="py-2 pr-3">Ha</th>
                      <th className="py-2 pr-3">Lote / Cliente</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3 font-bold">{item.machinery}</td>
                        <td className="py-2 pr-3">{item.operatorName}</td>
                        <td className="py-2 pr-3">{item.hectaresWorked}</td>
                        <td className="py-2 pr-3 text-slate-600">{item.plot} · {item.customer}</td>
                        <td className="py-2 pr-3 w-1 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
                            <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {kind === "customers" ? (
                <table className="w-full table-auto text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Email</th>
                      <th className="py-2 pr-3">Teléfono</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3 font-bold">{item.name}</td>
                        <td className="py-2 pr-3">{item.email ?? "-"}</td>
                        <td className="py-2 pr-3">{item.phone ?? "-"}</td>
                        <td className="py-2 pr-3">{item.active ? "Activo" : "Inactivo"}</td>
                        <td className="py-2 pr-3 w-1 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
                            <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {kind === "machineries" ? (
                <table className="w-full table-auto text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Marca</th>
                      <th className="py-2 pr-3">Identificador</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3 font-bold">{item.name}</td>
                        <td className="py-2 pr-3">{item.type ?? "-"}</td>
                        <td className="py-2 pr-3">{item.brand ?? "-"}</td>
                        <td className="py-2 pr-3">{item.identifier ?? "-"}</td>
                        <td className="py-2 pr-3">{item.active ? "Activo" : "Inactivo"}</td>
                        <td className="py-2 pr-3 w-1 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
                            <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {kind === "inventory" ? (
                <table className="w-full table-auto text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2 pr-3">Nombre</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">Cantidad</th>
                      <th className="py-2 pr-3">Mínimo</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 pr-3 font-bold">{item.name}</td>
                        <td className="py-2 pr-3">
                          {item.type === "FUEL" ? "Combustible" : item.type === "CHEMICAL" ? "Químico" : item.type}
                        </td>
                        <td className="py-2 pr-3">{item.quantity} {item.unit}</td>
                        <td className="py-2 pr-3">{item.minQuantity} {item.unit}</td>
                        <td className="py-2 pr-3">{item.active ? "Activo" : "Inactivo"}</td>
                        <td className="py-2 pr-3 w-1 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1.5">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
                            <Button type="button" variant="success" onClick={() => handleRestock(item.id)}>Reabastecer</Button>
                            <Button type="button" variant="destructive" onClick={() => handleDelete(item.id)}>Borrar</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getTitle(kind: EntityKind) {
  if (kind === "users") return "Usuarios";
  if (kind === "trips") return "Viajes";
  if (kind === "customers") return "Clientes";
  if (kind === "machineries") return "Maquinarias";
  if (kind === "inventory") return "Inventario";
  return "Partes diarios";
}

function getCreateButtonLabel(kind: EntityKind) {
  if (kind === "users") return "Crear usuario";
  if (kind === "trips") return "Crear viaje";
  if (kind === "customers") return "Crear cliente";
  if (kind === "machineries") return "Crear maquinaria";
  if (kind === "inventory") return "Crear producto de inventario";
  return "Crear parte diario";
}

function getEditFormTitle(kind: EntityKind) {
  if (kind === "users") return "Editar usuario";
  if (kind === "trips") return "Editar viaje";
  if (kind === "customers") return "Editar cliente";
  if (kind === "machineries") return "Editar maquinaria";
  if (kind === "inventory") return "Editar producto de inventario";
  return "Editar parte diario";
}

function getInitialForm(kind: EntityKind): Record<string, any> {
  if (kind === "users") {
    return { name: "", email: "", password: "", role: "ADMIN" };
  }
  if (kind === "trips") {
    return { licensePlate: "", driverName: "", driverId: "", truck: "", product: "", estimatedKg: "", origin: "", destination: "", status: "PENDING", fuelItemId: "", agroItemId: "" };
  }
  if (kind === "customers") {
    return { name: "", email: "", phone: "", address: "", documentNumber: "", active: "true" };
  }
  if (kind === "machineries") {
    return { name: "", type: "", brand: "", identifier: "", active: "true" };
  }
  if (kind === "inventory") {
    return { name: "", type: "FUEL", unit: "L", quantity: "", minQuantity: "", active: "true" };
  }
  return {
    machineryId: "",
    operatorName: "",
    operatorId: "",
    initialHourMeter: "",
    finalHourMeter: "",
    hectaresWorked: "",
    fuelLiters: "",
    fuelItemId: "",
    plot: "",
    customerId: "",
    chemicals: [
      { inventoryItemId: "", product: "", quantity: "", unit: "L" }
    ]
  };
}

function buildFormState(kind: EntityKind, item: any): Record<string, any> {
  if (kind === "users") {
    return { name: item.name, email: item.email, password: "", role: item.role };
  }
  if (kind === "trips") {
    return {
      licensePlate: item.licensePlate,
      driverName: item.driverName,
      driverId: item.driverId ?? "",
      truck: item.truck ?? "",
      product: item.product,
      estimatedKg: String(item.estimatedKg),
      origin: item.origin,
      destination: item.destination,
      status: item.status,
      fuelItemId: item.fuelItemId ?? "",
      agroItemId: item.agroItemId ?? ""
    };
  }
  if (kind === "customers") {
    return {
      name: item.name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      address: item.address ?? "",
      documentNumber: item.documentNumber ?? "",
      active: item.active ? "true" : "false"
    };
  }
  if (kind === "machineries") {
    return {
      name: item.name,
      type: item.type ?? "",
      brand: item.brand ?? "",
      identifier: item.identifier ?? "",
      active: item.active ? "true" : "false"
    };
  }
  if (kind === "inventory") {
    return {
      name: item.name,
      type: item.type,
      unit: item.unit,
      quantity: String(item.quantity ?? ""),
      minQuantity: String(item.minQuantity ?? ""),
      active: item.active ? "true" : "false"
    };
  }
  return {
    machineryId: item.machineryId ?? "",
    operatorName: item.operatorName,
    operatorId: item.operatorId ?? "",
    initialHourMeter: String(item.initialHourMeter),
    finalHourMeter: String(item.finalHourMeter),
    hectaresWorked: String(item.hectaresWorked),
    fuelLiters: String(item.fuelLiters),
    fuelItemId: item.fuelItemId ?? "",
    plot: item.plot,
    customerId: item.customerId ?? "",
    chemicals: (item.chemicals ?? []).map((chemical: any) => ({
      inventoryItemId: chemical.inventoryItemId ?? "",
      product: chemical.product ?? "",
      quantity: String(chemical.quantity ?? ""),
      unit: chemical.unit ?? "L"
    }))
  };
}

function validateForm(kind: EntityKind, form: Record<string, any>): string | null {
  if (kind === "users") {
    if (!form.name?.trim()) return "El nombre es obligatorio";
    if (!form.email?.trim()) return "El email es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El email no es válido";
    if (!form.password?.trim()) return "La contraseña es obligatoria";
    return null;
  }

  if (kind === "trips") {
    if (!form.licensePlate?.trim()) return "La patente es obligatoria";
    if (!form.driverName?.trim()) return "El conductor es obligatorio";
    if (!form.product?.trim()) return "El producto es obligatorio";
    if (!form.estimatedKg?.trim()) return "Los kg estimados son obligatorios";
    const estimatedKg = Number(form.estimatedKg);
    if (Number.isNaN(estimatedKg) || estimatedKg <= 0) return "Los kg estimados deben ser mayores a cero";
    return null;
  }

  if (kind === "customers") {
    if (!form.name?.trim()) return "El nombre es obligatorio";
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El email no es válido";
    return null;
  }

  if (kind === "machineries") {
    if (!form.name?.trim()) return "El nombre es obligatorio";
    return null;
  }

  if (kind === "inventory") {
    if (!form.name?.trim()) return "El nombre es obligatorio";
    if (!form.type?.trim()) return "El tipo es obligatorio";
    if (!form.unit?.trim()) return "La unidad es obligatoria";
    if (!form.quantity?.trim()) return "La cantidad es obligatoria";
    const quantity = Number(form.quantity);
    if (Number.isNaN(quantity) || quantity < 0) return "La cantidad debe ser un número válido";
    if (!form.minQuantity?.trim()) return "La cantidad mínima es obligatoria";
    const minQuantity = Number(form.minQuantity);
    if (Number.isNaN(minQuantity) || minQuantity < 0) return "La cantidad mínima debe ser un número válido";
    return null;
  }

  if (!form.machineryId?.trim()) return "La maquinaria es obligatoria";
  if (!form.operatorId?.trim()) return "El operador es obligatorio";
  if (!form.initialHourMeter?.trim()) return "La hora inicial es obligatoria";
  if (!form.finalHourMeter?.trim()) return "La hora final es obligatoria";
  if (!form.hectaresWorked?.trim()) return "Las hectáreas trabajadas son obligatorias";
  if (!form.fuelLiters?.trim()) return "Los litros son obligatorios";
  if (!form.customerId?.trim()) return "El cliente es obligatorio";

  const initialHourMeter = Number(form.initialHourMeter);
  const finalHourMeter = Number(form.finalHourMeter);
  const hectaresWorked = Number(form.hectaresWorked);
  const fuelLiters = Number(form.fuelLiters);

  if (Number.isNaN(initialHourMeter) || initialHourMeter < 0) return "La hora inicial debe ser mayor o igual a cero";
  if (Number.isNaN(finalHourMeter) || finalHourMeter < 0) return "La hora final debe ser mayor o igual a cero";
  if (finalHourMeter < initialHourMeter) return "La hora final debe ser mayor o igual a la inicial";
  if (Number.isNaN(hectaresWorked) || hectaresWorked <= 0) return "Las hectáreas deben ser mayores a cero";
  if (Number.isNaN(fuelLiters) || fuelLiters <= 0) return "Los litros deben ser mayores a cero";

  if (Array.isArray(form.chemicals)) {
    for (const chemical of form.chemicals) {
      if (chemical.product?.trim()) {
        if (!chemical.quantity?.trim()) return "La cantidad del químico es obligatoria";
        const quantity = Number(chemical.quantity);
        if (Number.isNaN(quantity) || quantity <= 0) return "La cantidad del químico debe ser mayor a cero";
        if (!chemical.unit?.trim()) return "La unidad del químico es obligatoria";
      }
    }
  }

  return null;
}

function buildPayload(
  kind: EntityKind,
  form: Record<string, string>,
  options: { customers: CustomerOption[]; machineries: MachineryOption[]; inventoryItems?: InventoryItemOption[] }
) {
  if (kind === "users") {
    return {
      name: form.name,
      email: form.email,
      role: form.role,
      ...(form.password ? { password: form.password } : {})
    };
  }
  if (kind === "trips") {
    return {
      licensePlate: form.licensePlate,
      driverId: form.driverId || null,
      driverName: form.driverName,
      truck: form.truck || null,
      product: form.product,
      estimatedKg: Number(form.estimatedKg),
      origin: form.origin,
      destination: form.destination,
      fuelItemId: form.fuelItemId || null,
      agroItemId: form.agroItemId || null,
      status: form.status
    };
  }
  if (kind === "customers") {
    return {
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null,
      documentNumber: form.documentNumber || null,
      active: form.active === "true"
    };
  }
  if (kind === "machineries") {
    return {
      name: form.name,
      type: form.type || null,
      brand: form.brand || null,
      identifier: form.identifier || null,
      active: form.active === "true"
    };
  }

  if (kind === "inventory") {
    return {
      name: form.name,
      type: form.type as "FUEL" | "CHEMICAL" | "AGRO",
      unit: form.unit,
      quantity: Number(form.quantity),
      minQuantity: Number(form.minQuantity),
      active: form.active === "true"
    };
  }

  const selectedMachinery = options.machineries.find((machinery) => machinery.id === form.machineryId);
  const selectedCustomer = options.customers.find((customer) => customer.id === form.customerId);

  return {
    machineryId: form.machineryId || null,
    machinery: selectedMachinery?.name ?? form.machineryId ?? "",
    operatorId: form.operatorId || null,
    operatorName: form.operatorName,
    initialHourMeter: Number(form.initialHourMeter),
    finalHourMeter: Number(form.finalHourMeter),
    hectaresWorked: Number(form.hectaresWorked),
    fuelLiters: Number(form.fuelLiters),
    fuelItemId: form.fuelItemId || null,
    plot: form.plot,
    customerId: form.customerId || null,
    customer: selectedCustomer?.name ?? form.customerId ?? "",
    chemicals: Array.isArray(form.chemicals)
      ? form.chemicals
        .filter((chemical: any) => chemical.product?.trim())
        .map((chemical: any) => ({
          inventoryItemId: chemical.inventoryItemId || null,
          product: chemical.product,
          quantity: Number(chemical.quantity),
          unit: chemical.unit
        }))
      : []
  };
}

function getStatusOptions(kind: EntityKind) {
  if (kind === "users") {
    return ROLE_OPTIONS;
  }

  if (kind === "trips") {
    return TRIP_STATUS_OPTIONS;
  }

  if (kind === "customers" || kind === "machineries" || kind === "inventory") {
    return [
      { value: "active", label: "Activos" },
      { value: "inactive", label: "Inactivos" }
    ];
  }

  return [];
}

function renderFields(
  kind: EntityKind,
  form: Record<string, any>,
  setForm: Dispatch<SetStateAction<Record<string, any>>>,
  options: {
    driverOptions: UserOption[];
    operatorOptions: UserOption[];
    customerOptions: CustomerOption[];
    machineryOptions: MachineryOption[];
    inventoryItems?: InventoryItemOption[];
  }
) {
  if (kind === "users") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" value={form.name ?? ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" value={form.password ?? ""} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rol</Label>
          <select id="role" value={form.role ?? "ADMIN"} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
        </div>
      </>
    );
  }

  if (kind === "trips") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="licensePlate">Patente</Label>
          <Input
            id="licensePlate"
            value={form.licensePlate ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, licensePlate: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="driverId">Conductor</Label>
          <select
            id="driverId"
            value={form.driverId ?? ""}
            onChange={(event) => {
              const selectedUser = options.driverOptions.find((user) => user.id === event.target.value);
              setForm((current) => ({
                ...current,
                driverId: event.target.value,
                driverName: selectedUser?.name ?? ""
              }));
            }}
            className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
            required
          >
            <option value="">Sin asignar</option>
            {options.driverOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="truck">Camión</Label>
          <Input
            id="truck"
            value={form.truck ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, truck: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product">Producto</Label>
          <Input
            id="product"
            value={form.product ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, product: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedKg">Kg Estimados</Label>
          <Input
            id="estimatedKg"
            type="number"
            value={form.estimatedKg ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, estimatedKg: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuelItemId">Tanque de combustible</Label>
          <select
            id="fuelItemId"
            value={form.fuelItemId ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, fuelItemId: event.target.value }))}
            className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
          >
            <option value="">Seleccionar tanque</option>
            {options.inventoryItems?.filter((item) => item.type === "FUEL").map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.quantity} {item.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agroItemId">Producto agro</Label>
          <select
            id="agroItemId"
            value={form.agroItemId ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, agroItemId: event.target.value }))}
            className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
          >
            <option value="">Seleccionar agro</option>
            {options.inventoryItems?.filter((item) => item.type === "AGRO").map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.quantity} {item.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="origin">Origen</Label>
          <Input
            id="origin"
            value={form.origin ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, origin: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination">Destino</Label>
          <Input
            id="destination"
            value={form.destination ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, destination: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <select
            id="status"
            value={form.status ?? "PENDING"}
            onChange={(event) =>
              setForm((current) => ({ ...current, status: event.target.value }))
            }
            className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
          >
            {TRIP_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </>
    );
  }

  if (kind === "customers") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="customerName">Nombre</Label>
          <Input id="customerName" value={form.name ?? ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email</Label>
          <Input id="customerEmail" type="email" value={form.email ?? ""} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerPhone">Teléfono</Label>
          <Input id="customerPhone" value={form.phone ?? ""} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerAddress">Dirección</Label>
          <Input id="customerAddress" value={form.address ?? ""} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerDocument">Documento</Label>
          <Input id="customerDocument" value={form.documentNumber ?? ""} onChange={(event) => setForm((current) => ({ ...current, documentNumber: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerActive">Estado</Label>
          <select id="customerActive" value={form.active ?? "true"} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </>
    );
  }

  if (kind === "machineries") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="machineryName">Nombre</Label>
          <Input id="machineryName" value={form.name ?? ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="machineryType">Tipo</Label>
          <Input id="machineryType" value={form.type ?? ""} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="machineryBrand">Marca</Label>
          <Input id="machineryBrand" value={form.brand ?? ""} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="machineryIdentifier">Identificador</Label>
          <Input id="machineryIdentifier" value={form.identifier ?? ""} onChange={(event) => setForm((current) => ({ ...current, identifier: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="machineryActive">Estado</Label>
          <select id="machineryActive" value={form.active ?? "true"} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </>
    );
  }

  if (kind === "inventory") {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="inventoryName">Nombre</Label>
          <Input id="inventoryName" value={form.name ?? ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventoryType">Tipo</Label>
          <select id="inventoryType" value={form.type ?? "FUEL"} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            <option value="FUEL">Combustible</option>
            <option value="CHEMICAL">Químico</option>
            <option value="AGRO">Agro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventoryUnit">Unidad</Label>
          <select id="inventoryUnit" value={form.unit ?? "L"} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900" required>
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventoryQuantity">Cantidad</Label>
          <Input id="inventoryQuantity" type="number" value={form.quantity ?? ""} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventoryMinQuantity">Cantidad mínima</Label>
          <Input id="inventoryMinQuantity" type="number" value={form.minQuantity ?? ""} onChange={(event) => setForm((current) => ({ ...current, minQuantity: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventoryActive">Estado</Label>
          <select id="inventoryActive" value={form.active ?? "true"} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
      </>
    );
  }

  if (kind === "work-orders") {
    const fuelItems = options.inventoryItems?.filter((item) => item.type === "FUEL") ?? [];
    const chemicalItems = options.inventoryItems?.filter((item) => item.type === "CHEMICAL") ?? [];

    const updateChemicalLine = (index: number, field: string, value: string) => {
      setForm((current) => ({
        ...current,
        chemicals: current.chemicals.map((item: any, itemIndex: number) =>
          itemIndex === index ? { ...item, [field]: value } : item
        )
      }));
    };

    const addChemicalLine = () => {
      setForm((current) => ({
        ...current,
        chemicals: [
          ...(current.chemicals ?? []),
          { inventoryItemId: "", product: "", quantity: "", unit: "L" }
        ]
      }));
    };

    const removeChemicalLine = (index: number) => {
      setForm((current) => ({
        ...current,
        chemicals: (current.chemicals ?? []).filter((_: any, itemIndex: number) => itemIndex !== index)
      }));
    };

    return (
      <>
        <div className="space-y-2">
          <Label htmlFor="machinery">Maquinaria</Label>
          <select id="machinery" value={form.machineryId ?? ""} onChange={(event) => setForm((current) => ({ ...current, machineryId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900" required>
            <option value="">Seleccionar maquinaria</option>
            {options.machineryOptions.map((machinery) => (
              <option key={machinery.id} value={machinery.id}>{machinery.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="operatorId">Operador</Label>
          <select id="operatorId" value={form.operatorId ?? ""} onChange={(event) => setForm((current) => ({ ...current, operatorId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900" required>
            <option value="">Seleccionar operador</option>
            {options.operatorOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="initialHourMeter">H. inicial</Label>
          <Input id="initialHourMeter" type="number" value={form.initialHourMeter ?? ""} onChange={(event) => setForm((current) => ({ ...current, initialHourMeter: event.target.value }))} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="finalHourMeter">H. final</Label>
          <Input id="finalHourMeter" type="number" value={form.finalHourMeter ?? ""} onChange={(event) => setForm((current) => ({ ...current, finalHourMeter: event.target.value }))} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hectaresWorked">Ha trabajadas</Label>
          <Input id="hectaresWorked" type="number" value={form.hectaresWorked ?? ""} onChange={(event) => setForm((current) => ({ ...current, hectaresWorked: event.target.value }))} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuelLiters">Litros</Label>
          <Input id="fuelLiters" type="number" value={form.fuelLiters ?? ""} onChange={(event) => setForm((current) => ({ ...current, fuelLiters: event.target.value }))} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuelItemId">Tanque de combustible</Label>
          <select id="fuelItemId" value={form.fuelItemId ?? ""} onChange={(event) => setForm((current) => ({ ...current, fuelItemId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            <option value="">Seleccionar tanque</option>
            {fuelItems.map((item) => (
              <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plot">Lote</Label>
          <Input id="plot" value={form.plot ?? ""} onChange={(event) => setForm((current) => ({ ...current, plot: event.target.value }))} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerId">Cliente</Label>
          <select id="customerId" value={form.customerId ?? ""} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900" required>
            <option value="">Seleccionar cliente</option>
            {options.customerOptions.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">Productos químicos usados</p>
            <button
              type="button"
              onClick={addChemicalLine}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Agregar químico
            </button>
          </div>
          {(form.chemicals ?? []).map((chemical: any, index: number) => (
            <div key={index} className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Label htmlFor={`chemical-inventory-${index}`}>Químico</Label>
                <select
                  id={`chemical-inventory-${index}`}
                  value={chemical.inventoryItemId ?? ""}
                  onChange={(event) => {
                    const inventoryItemId = event.target.value;
                    const selectedItem = chemicalItems.find((item) => item.id === inventoryItemId);
                    updateChemicalLine(index, "inventoryItemId", inventoryItemId);
                    if (selectedItem) {
                      updateChemicalLine(index, "product", selectedItem.name);
                      updateChemicalLine(index, "unit", selectedItem.unit);
                    }
                  }}
                  className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                >
                  <option value="">Seleccionar químico</option>
                  {chemicalItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit})</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor={`chemical-quantity-${index}`}>Cantidad</Label>
                <Input
                  id={`chemical-quantity-${index}`}
                  type="number"
                  min={0}
                  step="0.1"
                  value={chemical.quantity ?? ""}
                  onChange={(event) => updateChemicalLine(index, "quantity", event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor={`chemical-unit-${index}`}>Unidad</Label>
                <Input id={`chemical-unit-${index}`} value={chemical.unit ?? ""} onChange={(event) => updateChemicalLine(index, "unit", event.target.value)} />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeChemicalLine(index)}
                  className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="machinery">Maquinaria</Label>
        <select id="machinery" value={form.machineryId ?? ""} onChange={(event) => setForm((current) => ({ ...current, machineryId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
          <option value="">Seleccionar maquinaria</option>
          {options.machineryOptions.map((machinery) => (
            <option key={machinery.id} value={machinery.id}>{machinery.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="operatorId">Operador</Label>
        <select
          id="operatorId"
          value={form.operatorId ?? ""}
          onChange={(event) => {
            const selectedUser = options.operatorOptions.find((user) => user.id === event.target.value);
            setForm((current) => ({
              ...current,
              operatorId: event.target.value,
              operatorName: selectedUser?.name ?? ""
            }));
          }}
          className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
          required
        >
          <option value="">Sin asignar</option>
          {options.operatorOptions.map((user) => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="initialHourMeter">H. inicial</Label>
        <Input id="initialHourMeter" type="number" value={form.initialHourMeter ?? ""} onChange={(event) => setForm((current) => ({ ...current, initialHourMeter: event.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="finalHourMeter">H. final</Label>
        <Input id="finalHourMeter" type="number" value={form.finalHourMeter ?? ""} onChange={(event) => setForm((current) => ({ ...current, finalHourMeter: event.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hectaresWorked">Ha trabajadas</Label>
        <Input id="hectaresWorked" type="number" value={form.hectaresWorked ?? ""} onChange={(event) => setForm((current) => ({ ...current, hectaresWorked: event.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fuelLiters">Litros</Label>
        <Input id="fuelLiters" type="number" value={form.fuelLiters ?? ""} onChange={(event) => setForm((current) => ({ ...current, fuelLiters: event.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="plot">Lote</Label>
        <Input id="plot" value={form.plot ?? ""} onChange={(event) => setForm((current) => ({ ...current, plot: event.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customer">Cliente</Label>
        <select id="customer" value={form.customerId ?? ""} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
          <option value="">Seleccionar cliente</option>
          {options.customerOptions.map((customer) => (
            <option key={customer.id} value={customer.id}>{customer.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}
