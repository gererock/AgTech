"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, Fuel, LayoutDashboard, Save, Tractor, Truck } from "lucide-react";
import { OfflineStatusBanner } from "@/components/offline-status-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { cn } from "@/lib/utils";

type FieldMode = "trip" | "work-order";

interface FieldModeAppProps {
  initialMode?: FieldMode;
}

const initialTripForm = {
  licensePlate: "",
  driverName: "",
  product: "",
  estimatedKg: ""
};

const initialWorkOrderForm = {
  machinery: "",
  operatorName: "",
  initialHourMeter: "",
  finalHourMeter: "",
  hectaresWorked: "",
  fuelLiters: "",
  plot: "",
  customer: ""
};

export function FieldModeApp({ initialMode = "trip" }: FieldModeAppProps) {
  const [mode, setMode] = useState<FieldMode>(initialMode);
  const [tripForm, setTripForm] = useState(initialTripForm);
  const [workOrderForm, setWorkOrderForm] = useState(initialWorkOrderForm);
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

  const handleTripSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    const estimatedKg = Number(tripForm.estimatedKg);

    if (!Number.isFinite(estimatedKg) || estimatedKg <= 0) {
      setFormError("Ingresá kilos estimados válidos.");
      return;
    }

    try {
      const result = await saveTrip({
        licensePlate: tripForm.licensePlate,
        driverName: tripForm.driverName,
        product: tripForm.product,
        estimatedKg
      });

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

    const initialHourMeter = Number(workOrderForm.initialHourMeter);
    const finalHourMeter = Number(workOrderForm.finalHourMeter);
    const hectaresWorked = Number(workOrderForm.hectaresWorked);
    const fuelLiters = Number(workOrderForm.fuelLiters);

    if (
      ![initialHourMeter, finalHourMeter, hectaresWorked, fuelLiters].every(
        (value) => Number.isFinite(value) && value >= 0
      )
    ) {
      setFormError("Revisá los valores numéricos del parte diario.");
      return;
    }

    if (finalHourMeter < initialHourMeter) {
      setFormError("El horómetro final no puede ser menor que el inicial.");
      return;
    }

    try {
      const result = await saveWorkOrder({
        machinery: workOrderForm.machinery,
        operatorName: workOrderForm.operatorName,
        initialHourMeter,
        finalHourMeter,
        hectaresWorked,
        fuelLiters,
        plot: workOrderForm.plot,
        customer: workOrderForm.customer
      });

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
                <p className="text-sm font-semibold text-slate-600">Alta rápida para choferes.</p>
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
              <Field label="Chofer" htmlFor="driverName">
                <Input
                  id="driverName"
                  required
                  autoComplete="name"
                  placeholder="Nombre del chofer"
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
                <p className="text-sm font-semibold text-slate-600">Carga para maquinistas.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Maquinaria" htmlFor="machinery" className="sm:col-span-2">
                <Input
                  id="machinery"
                  required
                  placeholder="Tractor, pulverizadora..."
                  value={workOrderForm.machinery}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, machinery: event.target.value }))
                  }
                />
              </Field>
              <Field label="Maquinista" htmlFor="operatorName" className="sm:col-span-2">
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
              <Field label="Horómetro inicial" htmlFor="initialHourMeter">
                <Input
                  id="initialHourMeter"
                  required
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  type="number"
                  value={workOrderForm.initialHourMeter}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({
                      ...current,
                      initialHourMeter: event.target.value
                    }))
                  }
                />
              </Field>
              <Field label="Horómetro final" htmlFor="finalHourMeter">
                <Input
                  id="finalHourMeter"
                  required
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  type="number"
                  value={workOrderForm.finalHourMeter}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, finalHourMeter: event.target.value }))
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
              <Field label="Lote" htmlFor="plot">
                <Input
                  id="plot"
                  placeholder="Lote 12"
                  value={workOrderForm.plot}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, plot: event.target.value }))
                  }
                />
              </Field>
              <Field label="Cliente" htmlFor="customer">
                <Input
                  id="customer"
                  placeholder="Estancia / empresa"
                  value={workOrderForm.customer}
                  onChange={(event) =>
                    setWorkOrderForm((current) => ({ ...current, customer: event.target.value }))
                  }
                />
              </Field>
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
