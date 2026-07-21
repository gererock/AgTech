"use client";

import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getRoleLabel, ROLE_OPTIONS } from "@/lib/role-labels";
import { getTripStatusColorClassName, getTripStatusLabel, TRIP_STATUS_OPTIONS } from "@/lib/trip-status-labels";
import { cn } from "@/lib/utils";

const emptyForm: Record<string, string> = {};

export type EntityKind = "users" | "trips" | "work-orders" | "customers" | "machineries";

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

type FilterState = {
  search: string;
  status: string;
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
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState<FilterState>({ search: "", status: "", date: "" });
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

  useEffect(() => {
    void loadUsers();
    void loadCustomers();
    void loadMachineries();
  }, [loadUsers, loadCustomers, loadMachineries]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setEditingId(null);
    setForm(getInitialForm(kind));
    setFilters({ search: "", status: "", date: "" });
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
    const payload = buildPayload(kind, form, { customers, machineries });

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

  const driverOptions = users.filter((user) => user.role === "DRIVER" || user.role === "ADMIN");
  const operatorOptions = users.filter((user) => user.role === "MACHINE_OPERATOR" || user.role === "ADMIN");
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
                {renderFields(kind, form, setForm, { driverOptions, operatorOptions, customerOptions, machineryOptions })}
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
          {kind !== "users" && kind !== "customers" && kind !== "machineries" ? (
            <div className="w-full lg:w-48">
              <Label htmlFor="date-filter">Fecha</Label>
              <Input id="date-filter" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} />
            </div>
          ) : null}
          <Button type="button" variant="outline" onClick={() => setFilters({ search: "", status: "", date: "" })} className="w-full sm:w-auto">Limpiar</Button>
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
            </div>

            <div className="hidden overflow-x-auto sm:block">
              {kind === "users" ? (
                <table className="w-full min-w-[560px] text-left text-sm">
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
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
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
              <table className="w-full min-w-[900px] text-left text-sm">
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
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
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
                <table className="w-full min-w-[900px] text-left text-sm">
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
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
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
                <table className="w-full min-w-[720px] text-left text-sm">
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
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
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
                <table className="w-full min-w-[760px] text-left text-sm">
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
                        <td className="py-2 pr-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => handleEdit(item)}>Editar</Button>
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
  return "Partes diarios";
}

function getCreateButtonLabel(kind: EntityKind) {
  if (kind === "users") return "Crear usuario";
  if (kind === "trips") return "Crear viaje";
  if (kind === "customers") return "Crear cliente";
  if (kind === "machineries") return "Crear maquinaria";
  return "Crear parte diario";
}

function getEditFormTitle(kind: EntityKind) {
  if (kind === "users") return "Editar usuario";
  if (kind === "trips") return "Editar viaje";
  if (kind === "customers") return "Editar cliente";
  if (kind === "machineries") return "Editar maquinaria";
  return "Editar parte diario";
}

function getInitialForm(kind: EntityKind): Record<string, string> {
  if (kind === "users") {
    return { name: "", email: "", password: "", role: "ADMIN" };
  }
  if (kind === "trips") {
    return { licensePlate: "", driverName: "", driverId: "", truck: "", product: "", estimatedKg: "", origin: "", destination: "", status: "PENDING" };
  }
  if (kind === "customers") {
    return { name: "", email: "", phone: "", address: "", documentNumber: "", active: "true" };
  }
  if (kind === "machineries") {
    return { name: "", type: "", brand: "", identifier: "", active: "true" };
  }
  return { machineryId: "", operatorName: "", operatorId: "", initialHourMeter: "", finalHourMeter: "", hectaresWorked: "", fuelLiters: "", plot: "", customerId: "" };
}

function buildFormState(kind: EntityKind, item: any): Record<string, string> {
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
      status: item.status
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
  return {
    machineryId: item.machineryId ?? "",
    operatorName: item.operatorName,
    operatorId: item.operatorId ?? "",
    initialHourMeter: String(item.initialHourMeter),
    finalHourMeter: String(item.finalHourMeter),
    hectaresWorked: String(item.hectaresWorked),
    fuelLiters: String(item.fuelLiters),
    plot: item.plot,
    customerId: item.customerId ?? ""
  };
}

function validateForm(kind: EntityKind, form: Record<string, string>): string | null {
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

  if (!form.machineryId?.trim()) return "La maquinaria es obligatoria";
  if (!form.operatorName?.trim()) return "El operador es obligatorio";
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

  return null;
}

function buildPayload(
  kind: EntityKind,
  form: Record<string, string>,
  options: { customers: CustomerOption[]; machineries: MachineryOption[] }
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
    plot: form.plot,
    customerId: form.customerId || null,
    customer: selectedCustomer?.name ?? form.customerId ?? ""
  };
}

function getStatusOptions(kind: EntityKind) {
  if (kind === "users") {
    return ROLE_OPTIONS;
  }

  if (kind === "trips") {
    return TRIP_STATUS_OPTIONS;
  }

  if (kind === "customers" || kind === "machineries") {
    return [
      { value: "active", label: "Activos" },
      { value: "inactive", label: "Inactivos" }
    ];
  }

  return [];
}

function renderFields(
  kind: EntityKind,
  form: Record<string, string>,
  setForm: Dispatch<SetStateAction<Record<string, string>>>,
  options: { driverOptions: UserOption[]; operatorOptions: UserOption[]; customerOptions: CustomerOption[]; machineryOptions: MachineryOption[] }
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
          <Input id="licensePlate" value={form.licensePlate ?? ""} onChange={(event) => setForm((current) => ({ ...current, licensePlate: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverName">Conductor</Label>
          <Input id="driverName" value={form.driverName ?? ""} onChange={(event) => setForm((current) => ({ ...current, driverName: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="driverId">Asignar conductor</Label>
          <select id="driverId" value={form.driverId ?? ""} onChange={(event) => setForm((current) => ({ ...current, driverId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            <option value="">Sin asignar</option>
            {options.driverOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="truck">Camión</Label>
          <Input id="truck" value={form.truck ?? ""} onChange={(event) => setForm((current) => ({ ...current, truck: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product">Producto</Label>
          <Input id="product" value={form.product ?? ""} onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimatedKg">Kg estimados</Label>
          <Input id="estimatedKg" type="number" value={form.estimatedKg ?? ""} onChange={(event) => setForm((current) => ({ ...current, estimatedKg: event.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="origin">Origen</Label>
          <Input id="origin" value={form.origin ?? ""} onChange={(event) => setForm((current) => ({ ...current, origin: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">Destino</Label>
          <Input id="destination" value={form.destination ?? ""} onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <select id="status" value={form.status ?? "PENDING"} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
            {TRIP_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
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
        <Label htmlFor="operatorName">Operador</Label>
        <Input id="operatorName" value={form.operatorName ?? ""} onChange={(event) => setForm((current) => ({ ...current, operatorName: event.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="operatorId">Asignar operador</Label>
        <select id="operatorId" value={form.operatorId ?? ""} onChange={(event) => setForm((current) => ({ ...current, operatorId: event.target.value }))} className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900">
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
