"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Fuel, LayoutDashboard, Save, Tractor, Truck } from "lucide-react";
import { OfflineStatusBanner } from "@/components/offline-status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";
import { tripCreateSchema, workOrderCreateSchema } from "@/lib/sync-contracts";

type FieldMode = "trip" | "work-order";

interface FieldModeAppProps {
  initialMode?: FieldMode;
}

const initialTripForm = {
  licensePlate: "",
  driverName: "",
  product: "",
  estimatedKg: "",
  fuelLiters: "",
  fuelItemId: "",
  agroItemId: ""
};

const initialWorkOrderForm = {
  machinery: "",
  operatorName: "",
  hectaresWorked: "",
  fuelLiters: "",
  fuelItemId: "",
  plot: "",
  customer: "",
  chemicals: [
    { inventoryItemId: "", product: "", quantity: "", unit: "L" }
  ]
};

const AGRO_UNIT_OPTIONS = ["L", "KG", "G", "ML", "M3"] as const;

export function FieldModeApp({ initialMode = "trip" }: FieldModeAppProps) {
  const [mode, setMode] = useState<FieldMode>(initialMode);
  const [tripForm, setTripForm] = useState(initialTripForm);
  const [workOrderForm, setWorkOrderForm] = useState(initialWorkOrderForm);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);
  const [machineries, setMachineries] = useState<Array<{ id: string; name: string }>>([]);
  const [lots, setLots] = useState<Array<{ id: string; name: string; hectares: number }>>([]);
  const [inventoryItems, setInventoryItems] = useState<Array<{ id: string; name: string; type: "FUEL" | "CHEMICAL" | "AGRO"; unit: string; quantity: number }>>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncError,
    saveTrip,
    saveWorkOrder,
    syncPending
  } = useOfflineSync();

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [customersResponse, machineriesResponse, lotsResponse, inventoryResponse] = await Promise.all([
          fetch("/api/admin/customers"),
          fetch("/api/admin/machineries"),
          fetch("/api/admin/lots"),
          fetch("/api/admin/inventory")
        ]);

        if (customersResponse.ok) {
          setCustomers(await customersResponse.json());
        }
        if (machineriesResponse.ok) {
          setMachineries(await machineriesResponse.json());
        }
        if (lotsResponse.ok) {
          setLots(await lotsResponse.json());
        }
        if (inventoryResponse.ok) {
          setInventoryItems(await inventoryResponse.json());
        }
      } catch {
        setCustomers([]);
        setMachineries([]);
        setLots([]);
        setInventoryItems([]);
      }
    };

    void loadCatalogs();
  }, []);

  const handleTripSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    const payload = {
      licensePlate: tripForm.licensePlate.trim(),
      driverName: tripForm.driverName.trim(),
      product: tripForm.product.trim(),
      estimatedKg: Number(tripForm.estimatedKg),
      fuelLiters: Number(tripForm.fuelLiters) || 0,
      fuelItemId: tripForm.fuelItemId || undefined,
      agroItemId: tripForm.agroItemId || undefined
    };

    const validation = tripCreateSchema.safeParse(payload);

    if (!validation.success) {
      setFormError(validation.error.errors[0]?.message ?? "Revisá los datos del viaje.");
      return;
    }

    try {
      const result = await saveTrip(validation.data);

      setTripForm(initialTripForm);
      setFeedback(
        result.synced
          ? "Carta de porte guardada y sincronizada."
          : "Carta de porte guardada en el teléfono."
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleWorkOrderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    const payload = {
      machinery: workOrderForm.machinery.trim(),
      operatorName: workOrderForm.operatorName.trim(),
      hectaresWorked: Number(workOrderForm.hectaresWorked),
      fuelLiters: Number(workOrderForm.fuelLiters),
      fuelItemId: workOrderForm.fuelItemId || undefined,
      plot: workOrderForm.plot.trim() || undefined,
      customer: workOrderForm.customer.trim() || undefined,
      chemicals: (workOrderForm.chemicals ?? [])
        .filter((item) => item.product.trim() !== "")
        .map((item) => ({
          inventoryItemId: item.inventoryItemId || undefined,
          product: item.product.trim(),
          quantity: Number(item.quantity),
          unit: item.unit.trim() || "L"
        }))
    };

    const validation = workOrderCreateSchema.safeParse(payload);

    if (!validation.success) {
      setFormError(validation.error.errors[0]?.message ?? "Revisá los datos del parte diario.");
      return;
    }

    try {
      const result = await saveWorkOrder(validation.data);

      setWorkOrderForm(initialWorkOrderForm);
      setFeedback(
        result.synced
          ? "Parte diario guardado y sincronizado."
          : "Parte diario guardado en el teléfono."
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const fuelItems = inventoryItems.filter((item) => item.type === "FUEL");
  const chemicalItems = inventoryItems.filter((item) => item.type === "CHEMICAL");
  const agroItems = inventoryItems.filter((item) => item.type === "AGRO");

  const addChemicalLine = () => {
    setWorkOrderForm((current) => ({
      ...current,
      chemicals: [
        ...current.chemicals,
        { inventoryItemId: "", product: "", quantity: "", unit: "L" }
      ]
    }));
  };

  const updateChemicalLine = (index: number, field: string, value: string) => {
    setWorkOrderForm((current) => ({
      ...current,
      chemicals: current.chemicals.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeChemicalLine = (index: number) => {
    setWorkOrderForm((current) => ({
      ...current,
      chemicals: current.chemicals.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  return (
    <main className="min-h-screen pb-8">
      <OfflineStatusBanner
        isOnline={isOnline}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        lastSyncError={lastSyncError}
        onSync={() => {
          void syncPending();
        }}
      />

      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-5 sm:px-6">
        <header className="rounded-md border border-teal-100 bg-white p-4 shadow-field">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase text-teal-800">Modo campo</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Agro Operativo</h1>
            </div>
            <Link
              href="/dashboard"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
              aria-label="Abrir panel administrativo"
              title="Panel administrativo"
            >
              <LayoutDashboard className="h-5 w-5" />
            </Link>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
            Cargá viajes y partes diarios aunque no haya señal. La app sincroniza cuando vuelve la conexión.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("trip")}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-md text-sm font-extrabold transition-colors",
              mode === "trip"
                ? "bg-teal-700 text-white"
                : "bg-transparent text-slate-700 hover:bg-slate-100"
            )}
            aria-pressed={mode === "trip"}
          >
            <Truck className="h-5 w-5" />
            Viaje
          </button>
          <button
            type="button"
            onClick={() => setMode("work-order")}
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-md text-sm font-extrabold transition-colors",
              mode === "work-order"
                ? "bg-teal-700 text-white"
                : "bg-transparent text-slate-700 hover:bg-slate-100"
            )}
            aria-pressed={mode === "work-order"}
          >
            <Tractor className="h-5 w-5" />
            Parte
          </button>
        </div>

        {feedback ? (
          <div className="flex items-start gap-3 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-bold text-teal-900">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{feedback}</span>
          </div>
        ) : null}

        {formError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
            {formError}
          </div>
        ) : null}

        {mode === "trip" ? (
          <form
            onSubmit={handleTripSubmit}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-field"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-700 text-white">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Carta de Porte / Viaje</h2>
                <p className="text-sm font-semibold text-slate-600">Alta rápida para conductores.</p>
              </div>
            </div>

            <div className="grid gap-4">
              <Field label="Patente" htmlFor="licensePlate">
                <Input
                  id="licensePlate"
                  required
                  autoComplete="off"
                  placeholder="AB123CD"
                  value={tripForm.licensePlate}
                  onChange={(event) =>
                    setTripForm((current) => ({
                      ...current,
                      licensePlate: event.target.value.toUpperCase()
                    }))
                  }
                />
              </Field>
              <Field label="Conductor" htmlFor="driverName">
                <Input
                  id="driverName"
                  required
                  autoComplete="name"
                  placeholder="Nombre del conductor"
                  value={tripForm.driverName}
                  onChange={(event) =>
                    setTripForm((current) => ({ ...current, driverName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Producto" htmlFor="product">
                <Input
                  id="product"
                  required
                  placeholder="Soja, maíz, trigo..."
                  value={tripForm.product}
                  onChange={(event) =>
                    setTripForm((current) => ({ ...current, product: event.target.value }))
                  }
                />
              </Field>
              <Field label="Producto agro" htmlFor="agroItemId">
                <select
                  id="agroItemId"
                  value={tripForm.agroItemId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    const selectedItem = agroItems.find((item) => item.id === selectedId);
                    setTripForm((current) => ({
                      ...current,
                      agroItemId: selectedId,
                      product: selectedItem?.name ?? current.product
                    }));
                  }}
                  className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                >
                  <option value="">Sin seleccionar</option>
                  {agroItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Kg estimados" htmlFor="estimatedKg">
                <Input
                  id="estimatedKg"
                  required
                  inputMode="numeric"
                  min={1}
                  type="number"
                  placeholder="30000"
                  value={tripForm.estimatedKg}
                  onChange={(event) =>
                    setTripForm((current) => ({ ...current, estimatedKg: event.target.value }))
                  }
                />
              </Field>
              <Field label="Litros de gasoil" htmlFor="tripFuelLiters">
                <Input
                  id="tripFuelLiters"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  type="number"
                  placeholder="0"
                  value={tripForm.fuelLiters}
                  onChange={(event) =>
                    setTripForm((current) => ({ ...current, fuelLiters: event.target.value }))
                  }
                />
              </Field>
              <Field label="Tanque de combustible" htmlFor="tripFuelItemId">
                <select
                  id="tripFuelItemId"
                  value={tripForm.fuelItemId}
                  onChange={(event) =>
                    setTripForm((current) => ({ ...current, fuelItemId: event.target.value }))
                  }
                  className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                >
                  <option value="">Sin especificar</option>
                  {fuelItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Button className="mt-6 w-full" size="lg" type="submit" disabled={isSyncing}>
              <Save className="h-5 w-5" />
              Guardar viaje
            </Button>
          </form>
        ) : (
          <form
            onSubmit={handleWorkOrderSubmit}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-field"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-sky-600 text-white">
                <Fuel className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Parte Diario de Maquinaria</h2>
                <p className="text-sm font-semibold text-slate-600">Carga para operadores de maquina.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Maquinaria" htmlFor="machinery" className="sm:col-span-2">
                <select
                  id="machinery"
                  required
                  value={workOrderForm.machinery}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, machinery: event.target.value }))
                  }
                  className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                >
                  <option value="">Seleccionar maquinaria</option>
                  {machineries.map((machinery) => (
                    <option key={machinery.id} value={machinery.name}>{machinery.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Operador de maquina" htmlFor="operatorName" className="sm:col-span-2">
                <Input
                  id="operatorName"
                  required
                  autoComplete="name"
                  placeholder="Nombre del operador"
                  value={workOrderForm.operatorName}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, operatorName: event.target.value }))
                  }
                />
              </Field>
              <Field label="Hectáreas" htmlFor="hectaresWorked">
                <Input
                  id="hectaresWorked"
                  required
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  type="number"
                  value={workOrderForm.hectaresWorked}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({
                      ...current,
                      hectaresWorked: event.target.value
                    }))
                  }
                />
              </Field>
              <Field label="Litros de gasoil" htmlFor="fuelLiters">
                <Input
                  id="fuelLiters"
                  required
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  type="number"
                  value={workOrderForm.fuelLiters}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, fuelLiters: event.target.value }))
                  }
                />
              </Field>
              <Field label="Tanque de combustible" htmlFor="workOrderFuelItemId">
                <select
                  id="workOrderFuelItemId"
                  value={workOrderForm.fuelItemId}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, fuelItemId: event.target.value }))
                  }
                  className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                >
                  <option value="">Sin especificar</option>
                  {fuelItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity} {item.unit})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Lote" htmlFor="plot">
                <Input
                  id="plot"
                  list="lot-list"
                  placeholder="Buscar lote..."
                  autoComplete="off"
                  value={workOrderForm.plot}
                  onChange={(event) => {
                    const value = event.target.value;
                    const selectedLot = lots.find((lot) => lot.name === value);
                    setWorkOrderForm((current) => ({
                      ...current,
                      plot: value,
                      hectaresWorked: selectedLot ? String(selectedLot.hectares) : current.hectaresWorked
                    }));
                  }}
                />
                {lots.length > 0 ? (
                  <datalist id="lot-list">
                    {lots.map((lot) => (
                      <option key={lot.id} value={lot.name} />
                    ))}
                  </datalist>
                ) : null}
              </Field>
              <Field label="Cliente" htmlFor="customer">
                <select
                  id="customer"
                  value={workOrderForm.customer}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, customer: event.target.value }))
                  }
                  className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                >
                  <option value="">Seleccionar cliente</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.name}>{customer.name}</option>
                  ))}
                </select>
              </Field>
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
              {workOrderForm.chemicals.map((chemical, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor={`chemical-inventory-${index}`}>Químico</Label>
                    <select
                      id={`chemical-inventory-${index}`}
                      value={chemical.inventoryItemId}
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
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.quantity} {item.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor={`chemical-quantity-${index}`}>Cantidad</Label>
                    <Input
                      id={`chemical-quantity-${index}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      value={chemical.quantity}
                      onChange={(event) => updateChemicalLine(index, "quantity", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`chemical-unit-${index}`}>Unidad</Label>
                    <select
                      id={`chemical-unit-${index}`}
                      value={chemical.unit}
                      onChange={(event) => updateChemicalLine(index, "unit", event.target.value)}
                      className="flex h-[3.25rem] w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900"
                    >
                      {AGRO_UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
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

            <Button className="mt-6 w-full" size="lg" type="submit" disabled={isSyncing}>
              <Save className="h-5 w-5" />
              Guardar parte diario
            </Button>
          </form>
        )}
      </section>
    </main>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo guardar el registro.";
}
