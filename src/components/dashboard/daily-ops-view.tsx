"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DailyOpsViewProps {
  initialDate?: string;
}

type TripRecord = {
  id: string;
  licensePlate: string;
  driverName: string;
  product: string;
  status: string;
  origin: string;
  destination: string;
  estimatedKg: number;
  updatedAt: string;
};

type WorkOrderRecord = {
  id: string;
  machinery: string;
  operatorName: string;
  status: string;
  hectaresWorked: number;
  fuelLiters: number;
  plot: string;
  customer: string;
  updatedAt: string;
};

const statusOptions = ["PENDING", "IN_TRANSIT", "COMPLETED"] as const;
const workOrderStatusOptions = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export function DailyOpsView({ initialDate }: DailyOpsViewProps) {
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tripsResponse, workOrdersResponse] = await Promise.all([
        fetch(`/api/admin/trips?date=${date}`),
        fetch(`/api/admin/work-orders?date=${date}`)
      ]);
      if (tripsResponse.ok) setTrips(await tripsResponse.json());
      if (workOrdersResponse.ok) setWorkOrders(await workOrdersResponse.json());
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const completedTrips = trips.filter((trip) => trip.status === "COMPLETED").length;
    const activeTrips = trips.filter((trip) => trip.status !== "COMPLETED").length;
    const completedWorkOrders = workOrders.filter((workOrder) => workOrder.status === "COMPLETED").length;
    const pendingWorkOrders = workOrders.filter((workOrder) => workOrder.status === "PENDING").length;
    const totalFuel = workOrders.reduce((sum, workOrder) => sum + workOrder.fuelLiters, 0);
    const totalHectares = workOrders.reduce((sum, workOrder) => sum + workOrder.hectaresWorked, 0);

    return {
      completedTrips,
      activeTrips,
      completedWorkOrders,
      pendingWorkOrders,
      totalFuel,
      totalHectares
    };
  }, [trips, workOrders]);

  const updateTripStatus = async (id: string, status: string) => {
    const response = await fetch(`/api/admin/trips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      setMessage("Estado del viaje actualizado");
      await loadData();
    }
  };

  const updateWorkOrderStatus = async (id: string, status: string) => {
    const response = await fetch(`/api/admin/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      setMessage("Estado del parte actualizado");
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black">Operación del día</h2>
            <p className="text-sm text-slate-600">Resumen operativo listo para usar en la jornada.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-slate-700" htmlFor="ops-date">Fecha</label>
            <Input id="ops-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>

        {message ? <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-600">Viajes activos</p>
            <p className="mt-1 text-2xl font-black">{summary.activeTrips}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-600">Partes completados</p>
            <p className="mt-1 text-2xl font-black">{summary.completedWorkOrders}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-600">Combustible / ha</p>
            <p className="mt-1 text-2xl font-black">{summary.totalFuel.toFixed(1)} / {summary.totalHectares.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black">Viajes</h3>
              <p className="text-sm text-slate-600">Cambiar estados rapidamente desde la operación diaria.</p>
            </div>
          </div>
          {loading ? <p className="text-sm text-slate-600">Cargando...</p> : (
            <div className="space-y-3">
              {trips.length === 0 ? <p className="text-sm text-slate-600">No hay viajes para esta fecha.</p> : trips.map((trip) => (
                <div key={trip.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">{trip.licensePlate} · {trip.driverName}</p>
                      <p className="text-sm text-slate-600">{trip.product} · {trip.origin} → {trip.destination}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={trip.status === status ? "default" : "outline"}
                          size="default"
                          onClick={() => void updateTripStatus(trip.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black">Partes diarios</h3>
              <p className="text-sm text-slate-600">Actualizar el avance de la jornada sin salir de la vista.</p>
            </div>
          </div>
          {loading ? <p className="text-sm text-slate-600">Cargando...</p> : (
            <div className="space-y-3">
              {workOrders.length === 0 ? <p className="text-sm text-slate-600">No hay partes para esta fecha.</p> : workOrders.map((workOrder) => (
                <div key={workOrder.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">{workOrder.machinery} · {workOrder.operatorName}</p>
                      <p className="text-sm text-slate-600">{workOrder.plot} · {workOrder.customer}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workOrderStatusOptions.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={workOrder.status === status ? "default" : "outline"}
                          size="default"
                          onClick={() => void updateWorkOrderStatus(workOrder.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
