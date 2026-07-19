import type { Role, SyncEntityType, SyncStatus, TripStatus } from "@prisma/client";

export interface DashboardMetric {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: "teal" | "sky" | "amber" | "red" | "slate";
}

export interface StatusSlice {
  label: string;
  value: number;
  total: number;
  tone: "teal" | "sky" | "amber";
}

export interface FuelReportRow {
  machinery: string;
  fuelLiters: number;
  hectares: number;
  litersPerHa: number;
  estimatedCost: number;
}

export interface CustomerReportRow {
  customer: string;
  hectares: number;
  fuelLiters: number;
  workOrders: number;
}

export interface TripTableRow {
  id: string;
  licensePlate: string;
  driverName: string;
  product: string;
  estimatedKg: number;
  status: TripStatus;
  origin: string;
  destination: string;
  syncedAt: string;
}

export interface WorkOrderTableRow {
  id: string;
  machinery: string;
  operatorName: string;
  hectaresWorked: number;
  fuelLiters: number;
  plot: string;
  customer: string;
  syncedAt: string;
}

export interface SyncAuditRow {
  id: string;
  entityType: SyncEntityType;
  entityId: string | null;
  status: SyncStatus;
  message: string;
  createdAt: string;
}

export interface DriverRow {
  name: string;
  role: string;
  email: string;
  trips: number;
  lastSync: string;
}

export interface AssetRow {
  name: string;
  owner: string;
  records: number;
  hectares: number;
  fuelLiters: number;
  status: "Activo" | "Revisar";
}

export interface DashboardOverview {
  source: "database" | "demo";
  generatedAt: string;
  metrics: DashboardMetric[];
  tripStatus: StatusSlice[];
  fuelReport: FuelReportRow[];
  customerReport: CustomerReportRow[];
  recentTrips: TripTableRow[];
  recentWorkOrders: WorkOrderTableRow[];
  syncAudit: SyncAuditRow[];
  drivers: DriverRow[];
  assets: AssetRow[];
  customers: AssetRow[];
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0
});

const fuelCostPerLiter = 1080;

export async function getDashboardOverview(): Promise<DashboardOverview> {
  if (process.env.DASHBOARD_DATA_SOURCE !== "database" || !process.env.DATABASE_URL) {
    return getDemoDashboardOverview();
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const [trips, workOrders, users, syncLogs] = await Promise.all([
      prisma.trip.findMany({
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      prisma.workOrder.findMany({
        orderBy: { updatedAt: "desc" },
        take: 100
      }),
      prisma.user.findMany({
        orderBy: { name: "asc" }
      }),
      prisma.syncLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 25
      })
    ]);

    return buildOverview({
      source: "database",
      trips: trips.map((trip) => ({
        ...trip,
        syncedAt: trip.syncedAt?.toISOString() ?? trip.updatedAt.toISOString()
      })),
      workOrders: workOrders.map((workOrder) => ({
        ...workOrder,
        syncedAt: workOrder.syncedAt?.toISOString() ?? workOrder.updatedAt.toISOString()
      })),
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })),
      syncLogs: syncLogs.map((log) => ({
        id: log.id,
        entityType: log.entityType,
        entityId: log.entityId,
        status: log.status,
        message: log.message ?? getDefaultSyncMessage(log.status),
        createdAt: log.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.warn("Dashboard database read failed; falling back to demo data", error);
    return getDemoDashboardOverview();
  }
}

function buildOverview(input: {
  source: DashboardOverview["source"];
  trips: Array<TripTableRow>;
  workOrders: Array<WorkOrderTableRow>;
  users: Array<{ id: string; name: string; email: string; role: Role }>;
  syncLogs: SyncAuditRow[];
}): DashboardOverview {
  const totalHectares = input.workOrders.reduce((sum, order) => sum + order.hectaresWorked, 0);
  const totalFuel = input.workOrders.reduce((sum, order) => sum + order.fuelLiters, 0);
  const pendingTrips = input.trips.filter((trip) => trip.status === "PENDING").length;
  const inTransitTrips = input.trips.filter((trip) => trip.status === "IN_TRANSIT").length;
  const completedTrips = input.trips.filter((trip) => trip.status === "COMPLETED").length;
  const conflicts = input.syncLogs.filter((log) => log.status === "FAILED").length;
  const totalTripStatus = Math.max(input.trips.length, 1);
  const drivers = buildDrivers(input.users, input.trips);
  const assets = buildAssetRows(input.workOrders);
  const customers = buildCustomerRows(input.workOrders);

  return {
    source: input.source,
    generatedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Viajes activos",
        value: integerFormatter.format(pendingTrips + inTransitTrips),
        detail: `${integerFormatter.format(completedTrips)} completados`,
        trend: "Semana operativa",
        tone: "teal"
      },
      {
        label: "Hectareas trabajadas",
        value: numberFormatter.format(totalHectares),
        detail: `${numberFormatter.format(totalFuel)} L de gasoil`,
        trend: "Partes sincronizados",
        tone: "sky"
      },
      {
        label: "Costo combustible",
        value: currencyFormatter.format(totalFuel * fuelCostPerLiter),
        detail: `${numberFormatter.format(calculateRatio(totalFuel, totalHectares))} L/ha promedio`,
        trend: "Estimacion operativa",
        tone: "amber"
      },
      {
        label: "Alertas de sync",
        value: integerFormatter.format(conflicts),
        detail: `${integerFormatter.format(input.syncLogs.length)} eventos auditados`,
        trend: conflicts > 0 ? "Requiere revision" : "Sin conflictos",
        tone: conflicts > 0 ? "red" : "slate"
      }
    ],
    tripStatus: [
      {
        label: "Pendientes",
        value: pendingTrips,
        total: totalTripStatus,
        tone: "amber"
      },
      {
        label: "En viaje",
        value: inTransitTrips,
        total: totalTripStatus,
        tone: "sky"
      },
      {
        label: "Completados",
        value: completedTrips,
        total: totalTripStatus,
        tone: "teal"
      }
    ],
    fuelReport: assets.map((asset) => ({
      machinery: asset.name,
      fuelLiters: asset.fuelLiters,
      hectares: asset.hectares,
      litersPerHa: calculateRatio(asset.fuelLiters, asset.hectares),
      estimatedCost: asset.fuelLiters * fuelCostPerLiter
    })),
    customerReport: customers.map((customer) => ({
      customer: customer.name,
      hectares: customer.hectares,
      fuelLiters: customer.fuelLiters,
      workOrders: customer.records
    })),
    recentTrips: input.trips.slice(0, 8),
    recentWorkOrders: input.workOrders.slice(0, 8),
    syncAudit: input.syncLogs.slice(0, 8),
    drivers,
    assets,
    customers
  };
}

function buildDrivers(users: Array<{ name: string; email: string; role: Role }>, trips: TripTableRow[]) {
  const driverUsers = users.filter((user) => user.role === "DRIVER");
  const driverNames = new Set(driverUsers.map((user) => user.name));

  trips.forEach((trip) => driverNames.add(trip.driverName));

  return Array.from(driverNames).map((name) => {
    const user = driverUsers.find((driver) => driver.name === name);
    const driverTrips = trips.filter((trip) => trip.driverName === name);

    return {
      name,
      role: "Chofer",
      email: user?.email ?? "Sin email",
      trips: driverTrips.length,
      lastSync: driverTrips[0]?.syncedAt ?? "Sin actividad"
    };
  });
}

function buildAssetRows(workOrders: WorkOrderTableRow[]): AssetRow[] {
  const byMachine = groupWorkOrders(workOrders, (workOrder) => workOrder.machinery);

  return Array.from(byMachine.entries()).map(([machinery, records]) => {
    const hectares = records.reduce((sum, record) => sum + record.hectaresWorked, 0);
    const fuelLiters = records.reduce((sum, record) => sum + record.fuelLiters, 0);

    return {
      name: machinery,
      owner: records[0]?.operatorName ?? "Sin operador",
      records: records.length,
      hectares,
      fuelLiters,
      status: calculateRatio(fuelLiters, hectares) > 15 ? "Revisar" : "Activo"
    };
  });
}

function buildCustomerRows(workOrders: WorkOrderTableRow[]): AssetRow[] {
  const byCustomer = groupWorkOrders(workOrders, (workOrder) => workOrder.customer);

  return Array.from(byCustomer.entries()).map(([customer, records]) => ({
    name: customer,
    owner: records[0]?.plot ?? "Sin lote",
    records: records.length,
    hectares: records.reduce((sum, record) => sum + record.hectaresWorked, 0),
    fuelLiters: records.reduce((sum, record) => sum + record.fuelLiters, 0),
    status: "Activo"
  }));
}

function groupWorkOrders<TValue extends string>(
  records: WorkOrderTableRow[],
  getKey: (record: WorkOrderTableRow) => TValue
) {
  return records.reduce((groups, record) => {
    const key = getKey(record) || ("Sin informar" as TValue);
    const current = groups.get(key) ?? [];
    current.push(record);
    groups.set(key, current);
    return groups;
  }, new Map<TValue, WorkOrderTableRow[]>());
}

function calculateRatio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function getDefaultSyncMessage(status: SyncStatus) {
  return status === "SUCCESS" ? "Registro sincronizado" : "Revision pendiente";
}

function getDemoDashboardOverview(): DashboardOverview {
  return buildOverview({
    source: "demo",
    trips: [
      {
        id: "0f54c716-6d07-40dc-b40c-1193bb0f316a",
        licensePlate: "AB123CD",
        driverName: "Martin Rivas",
        product: "Soja",
        estimatedKg: 31200,
        status: "IN_TRANSIT",
        origin: "Campo La Esperanza",
        destination: "Acopio Norte",
        syncedAt: "2026-07-19T12:20:00.000Z"
      },
      {
        id: "4accd38d-ef20-4692-8784-59cbba0d6793",
        licensePlate: "AE845LP",
        driverName: "Laura Medina",
        product: "Maiz",
        estimatedKg: 29800,
        status: "PENDING",
        origin: "Lote 8",
        destination: "Puerto Rosario",
        syncedAt: "2026-07-19T11:10:00.000Z"
      },
      {
        id: "450b2434-a3f1-4f96-b49e-1072837a1889",
        licensePlate: "AF310TR",
        driverName: "Ruben Sosa",
        product: "Trigo",
        estimatedKg: 27300,
        status: "COMPLETED",
        origin: "Campo San Pedro",
        destination: "Molino Centro",
        syncedAt: "2026-07-18T18:45:00.000Z"
      }
    ],
    workOrders: [
      {
        id: "2cefb24a-dc77-412d-a910-e6dd9f7cf15c",
        machinery: "Pulverizadora Pla MAP II",
        operatorName: "Nicolas Duarte",
        hectaresWorked: 146,
        fuelLiters: 980,
        plot: "Lote 12",
        customer: "Agroservicios Norte",
        syncedAt: "2026-07-19T10:35:00.000Z"
      },
      {
        id: "54a81258-b18b-445e-879a-54a9fbe85fc4",
        machinery: "Tractor John Deere 7215J",
        operatorName: "Eva Molina",
        hectaresWorked: 82,
        fuelLiters: 720,
        plot: "Lote 4",
        customer: "Estancia Las Talas",
        syncedAt: "2026-07-19T09:50:00.000Z"
      },
      {
        id: "99342cb6-2f26-4d3e-b822-32343de0fca5",
        machinery: "Cosechadora Case 8250",
        operatorName: "Tomas Alvarez",
        hectaresWorked: 118,
        fuelLiters: 1510,
        plot: "Lote 18",
        customer: "Agroservicios Norte",
        syncedAt: "2026-07-18T21:18:00.000Z"
      }
    ],
    users: [
      {
        id: "ba5dd187-4f96-4472-a908-230d2012317b",
        name: "Martin Rivas",
        email: "martin@campo.local",
        role: "DRIVER"
      },
      {
        id: "4e044138-0669-4914-96aa-6ed5222a63dd",
        name: "Laura Medina",
        email: "laura@campo.local",
        role: "DRIVER"
      }
    ],
    syncLogs: [
      {
        id: "7c536763-f2b4-438b-a182-51a93f262490",
        entityType: "TRIP",
        entityId: "0f54c716-6d07-40dc-b40c-1193bb0f316a",
        status: "SUCCESS",
        message: "Carta de porte sincronizada",
        createdAt: "2026-07-19T12:21:00.000Z"
      },
      {
        id: "856efcf2-0ad3-447a-95df-72a44bbaab41",
        entityType: "WORK_ORDER",
        entityId: "99342cb6-2f26-4d3e-b822-32343de0fca5",
        status: "FAILED",
        message: "Diferencia de horometro para revisar",
        createdAt: "2026-07-19T08:05:00.000Z"
      }
    ]
  });
}
