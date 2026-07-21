"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getTripStatusColorClassName, getTripStatusLabel, TRIP_STATUS_OPTIONS } from "@/lib/trip-status-labels";

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
  hectaresWorked: number;
  fuelLiters: number;
  plot: string;
  customer: string;
  updatedAt: string;
};

type TripStatusChange = {
  id: string;
  label: string;
  previousStatus: string;
  nextStatus: string;
};

const statusOptions = TRIP_STATUS_OPTIONS.map((option) => option.value);

export function DailyOpsView({ initialDate }: DailyOpsViewProps) {
  const [date, setDate] = useState(initialDate ?? new Date().toISOString().slice(0, 10));
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isTripStatusEditMode, setIsTripStatusEditMode] = useState(false);
  const [draftTripStatuses, setDraftTripStatuses] = useState<Record<string, string>>({});
  const [pendingTripStatusChanges, setPendingTripStatusChanges] = useState<TripStatusChange[] | null>(null);
  const [isUpdatingTripStatuses, setIsUpdatingTripStatuses] = useState(false);

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

  useEffect(() => {
    setIsTripStatusEditMode(false);
    setDraftTripStatuses({});
    setPendingTripStatusChanges(null);
  }, [date]);

  const summary = useMemo(() => {
    const completedTrips = trips.filter((trip) => trip.status === "COMPLETED").length;
    const activeTrips = trips.filter((trip) => trip.status !== "COMPLETED").length;
    const totalFuel = workOrders.reduce((sum, workOrder) => sum + workOrder.fuelLiters, 0);
    const totalHectares = workOrders.reduce((sum, workOrder) => sum + workOrder.hectaresWorked, 0);

    return {
      completedTrips,
      activeTrips,
      workOrderCount: workOrders.length,
      totalFuel,
      totalHectares
    };
  }, [trips, workOrders]);

  const getTripStatusChanges = useCallback(() => {
    return trips.flatMap((trip) => {
      const nextStatus = draftTripStatuses[trip.id] ?? trip.status;

      if (nextStatus === trip.status) {
        return [];
      }

      return [
        {
          id: trip.id,
          label: `${trip.licensePlate} - ${trip.driverName}`,
          previousStatus: trip.status,
          nextStatus
        }
      ];
    });
  }, [draftTripStatuses, trips]);

  const handleTripStatusAction = () => {
    if (!isTripStatusEditMode) {
      setMessage(null);
      setPendingTripStatusChanges(null);
      setDraftTripStatuses(Object.fromEntries(trips.map((trip) => [trip.id, trip.status])));
      setIsTripStatusEditMode(true);
      return;
    }

    const changes = getTripStatusChanges();

    if (changes.length === 0) {
      setMessage("No hay cambios de estado para actualizar.");
      setIsTripStatusEditMode(false);
      setDraftTripStatuses({});
      setPendingTripStatusChanges(null);
      return;
    }

    setPendingTripStatusChanges(changes);
  };

  const handleTripStatusSelection = (tripId: string, status: string) => {
    if (!isTripStatusEditMode || pendingTripStatusChanges) {
      return;
    }

    setDraftTripStatuses((current) => ({ ...current, [tripId]: status }));
  };

  const confirmTripStatusUpdate = async () => {
    if (!pendingTripStatusChanges || pendingTripStatusChanges.length === 0) {
      return;
    }

    setIsUpdatingTripStatuses(true);

    try {
      const responses = await Promise.all(
        pendingTripStatusChanges.map((change) =>
          fetch(`/api/admin/trips/${change.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: change.nextStatus })
          })
        )
      );

      if (responses.some((response) => !response.ok)) {
        setMessage("No se pudieron actualizar todos los estados de viaje.");
        return;
      }

      setMessage("Estados de viaje actualizados correctamente.");
      setIsTripStatusEditMode(false);
      setDraftTripStatuses({});
      setPendingTripStatusChanges(null);
      await loadData();
    } finally {
      setIsUpdatingTripStatuses(false);
    }
  };

  const cancelTripStatusUpdate = () => {
    setPendingTripStatusChanges(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-black">Operacion del dia</h2>
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
            <p className="text-sm font-bold text-slate-600">Partes cargados</p>
            <p className="mt-1 text-2xl font-black">{summary.workOrderCount}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-600">Combustible / ha</p>
            <p className="mt-1 text-2xl font-black">{summary.totalFuel.toFixed(1)} / {summary.totalHectares.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">Viajes</h3>
              <p className="text-sm text-slate-600">Cambiar estados rapidamente desde la operacion diaria.</p>
            </div>
            <Button
              type="button"
              variant={isTripStatusEditMode ? "destructive" : "outline"}
              onClick={handleTripStatusAction}
              disabled={loading || isUpdatingTripStatuses || trips.length === 0 || Boolean(pendingTripStatusChanges)}
            >
              {isTripStatusEditMode ? "Actualizar" : "Editar estado"}
            </Button>
          </div>

          {pendingTripStatusChanges ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-black">Confirmar actualizacion de los viajes</p>
              <div className="mt-2 grid gap-1">
                {pendingTripStatusChanges.map((change) => (
                  <p key={change.id} className="font-semibold">
                    Se actualiza {change.label} de {getTripStatusLabel(change.previousStatus)} a {getTripStatusLabel(change.nextStatus)}.
                  </p>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void confirmTripStatusUpdate()}
                  disabled={isUpdatingTripStatuses}
                >
                  Confirmar actualizacion
                </Button>
                <Button type="button" variant="outline" onClick={cancelTripStatusUpdate} disabled={isUpdatingTripStatuses}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : null}

          {loading ? <p className="text-sm text-slate-600">Cargando...</p> : (
            <div className="space-y-3">
              {trips.length === 0 ? <p className="text-sm text-slate-600">No hay viajes para esta fecha.</p> : trips.map((trip) => {
                const selectedStatus = draftTripStatuses[trip.id] ?? trip.status;
                const visibleStatusOptions = isTripStatusEditMode ? statusOptions : [trip.status];

                return (
                  <div key={trip.id} className="rounded-md border border-slate-200 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-black">{trip.licensePlate} - {trip.driverName}</p>
                        <p className="text-sm text-slate-600">{trip.product} - {trip.origin} a {trip.destination}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {visibleStatusOptions.map((status) => (
                          <Button
                            key={status}
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={() => handleTripStatusSelection(trip.id, status)}
                            className={getTripStatusColorClassName(status, selectedStatus === status)}
                            aria-pressed={selectedStatus === status}
                          >
                            {getTripStatusLabel(status)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black">Partes diarios</h3>
              <p className="text-sm text-slate-600">Registros de trabajo cargados para la jornada.</p>
            </div>
          </div>
          {loading ? <p className="text-sm text-slate-600">Cargando...</p> : (
            <div className="space-y-3">
              {workOrders.length === 0 ? <p className="text-sm text-slate-600">No hay partes para esta fecha.</p> : workOrders.map((workOrder) => (
                <div key={workOrder.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">{workOrder.machinery} - {workOrder.operatorName}</p>
                      <p className="text-sm text-slate-600">{workOrder.plot} - {workOrder.customer}</p>
                    </div>
                    <div className="text-right text-sm font-bold text-slate-600">
                      <p>{workOrder.hectaresWorked} ha</p>
                      <p>{workOrder.fuelLiters} L</p>
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
