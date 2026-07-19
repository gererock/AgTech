"use client";

import { useCallback, useEffect, useState } from "react";

const emptyForm: Record<string, string> = {};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EntityKind = "users" | "trips" | "work-orders";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type TripRow = {
  id: string;
  licensePlate: string;
  driverName: string;
  truck: string | null;
  product: string;
  estimatedKg: number;
  origin: string;
  destination: string;
  status: string;
};

type WorkOrderRow = {
  id: string;
  machinery: string;
  operatorName: string;
  initialHourMeter: number;
  finalHourMeter: number;
  hectaresWorked: number;
  fuelLiters: number;
  plot: string;
  customer: string;
};

interface EntityManagerProps {
  kind: EntityKind;
}

export function EntityManager({ kind }: EntityManagerProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${kind}`);
      if (response.ok) {
        setItems(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setEditingId(null);
    setForm(getInitialForm(kind));
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
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
    const payload = buildPayload(kind, form);

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
      resetForm();
      await loadItems();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm(buildFormState(kind, item));
    setMessage(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que querés eliminar este registro?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/${kind}/${id}`, { method: "DELETE" });
      if (response.ok) {
        setMessage({ type: "success", text: "Registro eliminado correctamente" });
        await loadItems();
      } else {
        setMessage({ type: "error", text: "No se pudo eliminar el registro" });
      }
    } catch {
      setMessage({ type: "error", text: "No se pudo eliminar el registro" });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{getTitle(kind)}</h2>
          <Button type="button" variant="outline" onClick={resetForm}>Limpiar</Button>
        </div>
        {message ? (
          <div className={`mb-4 rounded-md border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {renderFields(kind, form, setForm)}
          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}</Button>
          </div>
        </div>
      </form>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-600">Cargando...</p>
        ) : (
          <div className="overflow-x-auto">
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
                      <td className="py-2 pr-3">{item.role}</td>
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
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Patente</th>
                    <th className="py-2 pr-3">Chofer</th>
                    <th className="py-2 pr-3">Producto</th>
                    <th className="py-2 pr-3">Kg</th>
                    <th className="py-2 pr-3">Estado</th>
                    <th className="py-2 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 font-bold">{item.licensePlate}</td>
                      <td className="py-2 pr-3">{item.driverName}</td>
                      <td className="py-2 pr-3">{item.product}</td>
                      <td className="py-2 pr-3">{item.estimatedKg}</td>
                      <td className="py-2 pr-3">{item.status}</td>
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
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Maquinaria</th>
                    <th className="py-2 pr-3">Operador</th>
                    <th className="py-2 pr-3">Ha</th>
                    <th className="py-2 pr-3">Litros</th>
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-3 font-bold">{item.machinery}</td>
                      <td className="py-2 pr-3">{item.operatorName}</td>
                      <td className="py-2 pr-3">{item.hectaresWorked}</td>
                      <td className="py-2 pr-3">{item.fuelLiters}</td>
                      <td className="py-2 pr-3">{item.customer}</td>
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
        )}
      </div>
    </div>
  );
}

function getTitle(kind: EntityKind) {
  if (kind === "users") return "Usuarios";
  if (kind === "trips") return "Viajes";
  return "Partes diarios";
}

function getInitialForm(kind: EntityKind): Record<string, string> {
  if (kind === "users") {
    return { name: "", email: "", password: "", role: "ADMIN" };
  }
  if (kind === "trips") {
    return { licensePlate: "", driverName: "", truck: "", product: "", estimatedKg: "", origin: "", destination: "", status: "PENDING" };
  }
  return { machinery: "", operatorName: "", initialHourMeter: "", finalHourMeter: "", hectaresWorked: "", fuelLiters: "", plot: "", customer: "" };
}

function buildFormState(kind: EntityKind, item: any): Record<string, string> {
  if (kind === "users") {
    return { name: item.name, email: item.email, password: "", role: item.role };
  }
  if (kind === "trips") {
    return { licensePlate: item.licensePlate, driverName: item.driverName, truck: item.truck ?? "", product: item.product, estimatedKg: String(item.estimatedKg), origin: item.origin, destination: item.destination, status: item.status };
  }
  return { machinery: item.machinery, operatorName: item.operatorName, initialHourMeter: String(item.initialHourMeter), finalHourMeter: String(item.finalHourMeter), hectaresWorked: String(item.hectaresWorked), fuelLiters: String(item.fuelLiters), plot: item.plot, customer: item.customer };
}

function validateForm(kind: EntityKind, form: Record<string, string>): string | null {
  if (kind === "users") {
    if (!form.name?.trim()) return "El nombre es obligatorio";
    if (!form.email?.trim()) return "El email es obligatorio";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El email no es válido";
    if (!form.password?.trim() && !form.role) return "La contraseña es obligatoria";
    if (!form.password?.trim() && !form.name) return "La contraseña es obligatoria";
    if (!form.password?.trim() && !form.email) return "La contraseña es obligatoria";
    return null;
  }

  if (kind === "trips") {
    if (!form.licensePlate?.trim()) return "La patente es obligatoria";
    if (!form.driverName?.trim()) return "El chofer es obligatorio";
    if (!form.product?.trim()) return "El producto es obligatorio";
    if (!form.estimatedKg?.trim()) return "Los kg estimados son obligatorios";
    const estimatedKg = Number(form.estimatedKg);
    if (Number.isNaN(estimatedKg) || estimatedKg <= 0) return "Los kg estimados deben ser mayores a cero";
    return null;
  }

  if (!form.machinery?.trim()) return "La maquinaria es obligatoria";
  if (!form.operatorName?.trim()) return "El operador es obligatorio";
  if (!form.initialHourMeter?.trim()) return "La hora inicial es obligatoria";
  if (!form.finalHourMeter?.trim()) return "La hora final es obligatoria";
  if (!form.hectaresWorked?.trim()) return "Las hectáreas trabajadas son obligatorias";
  if (!form.fuelLiters?.trim()) return "Los litros son obligatorios";

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

function buildPayload(kind: EntityKind, form: Record<string, string>) {
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
      driverName: form.driverName,
      truck: form.truck || null,
      product: form.product,
      estimatedKg: Number(form.estimatedKg),
      origin: form.origin,
      destination: form.destination,
      status: form.status
    };
  }
  return {
    machinery: form.machinery,
    operatorName: form.operatorName,
    initialHourMeter: Number(form.initialHourMeter),
    finalHourMeter: Number(form.finalHourMeter),
    hectaresWorked: Number(form.hectaresWorked),
    fuelLiters: Number(form.fuelLiters),
    plot: form.plot,
    customer: form.customer
  };
}

function renderFields(kind: EntityKind, form: Record<string, string>, setForm: React.Dispatch<React.SetStateAction<Record<string, string>>>) {
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
            <option value="ADMIN">ADMIN</option>
            <option value="DRIVER">DRIVER</option>
            <option value="MACHINE_OPERATOR">MACHINE_OPERATOR</option>
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
          <Label htmlFor="driverName">Chofer</Label>
          <Input id="driverName" value={form.driverName ?? ""} onChange={(event) => setForm((current) => ({ ...current, driverName: event.target.value }))} required />
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
            <option value="PENDING">PENDING</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="machinery">Maquinaria</Label>
        <Input id="machinery" value={form.machinery ?? ""} onChange={(event) => setForm((current) => ({ ...current, machinery: event.target.value }))} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="operatorName">Operador</Label>
        <Input id="operatorName" value={form.operatorName ?? ""} onChange={(event) => setForm((current) => ({ ...current, operatorName: event.target.value }))} required />
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
        <Input id="customer" value={form.customer ?? ""} onChange={(event) => setForm((current) => ({ ...current, customer: event.target.value }))} />
      </div>
    </>
  );
}
