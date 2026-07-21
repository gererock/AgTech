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
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for dashboard data");
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
    console.error("Dashboard database read failed", error);
    throw error;
  }
}

function buildOverview(input: {
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
        label: "Pendiente",
        value: pendingTrips,
        total: totalTripStatus,
        tone: "amber"
      },
      {
        label: "En transito",
        value: inTransitTrips,
        total: totalTripStatus,
        tone: "sky"
      },
      {
        label: "Completado",
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
      role: "Conductor",
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
