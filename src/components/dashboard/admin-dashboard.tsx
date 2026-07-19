import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Fuel,
  Gauge,
  LayoutDashboard,
  RefreshCw,
  Tractor,
  Truck,
  Users
} from "lucide-react";
import type {
  AssetRow,
  CustomerReportRow,
  DashboardMetric,
  DashboardOverview,
  FuelReportRow,
  StatusSlice,
  SyncAuditRow,
  TripTableRow,
  WorkOrderTableRow
} from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

interface AdminDashboardProps {
  overview: DashboardOverview;
}

const numberFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 0
});

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function AdminDashboard({ overview }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-5 py-5">
            <p className="text-xs font-extrabold uppercase text-teal-700">Agro Operativo</p>
            <h1 className="mt-1 text-xl font-black">Backoffice</h1>
          </div>
          <nav className="grid gap-1 p-3 text-sm font-bold text-slate-700">
            <SidebarItem icon={<LayoutDashboard className="h-4 w-4" />} label="Resumen" active />
            <SidebarItem icon={<Truck className="h-4 w-4" />} label="Viajes" />
            <SidebarItem icon={<Tractor className="h-4 w-4" />} label="Maquinaria" />
            <SidebarItem icon={<Users className="h-4 w-4" />} label="Clientes" />
            <SidebarItem icon={<RefreshCw className="h-4 w-4" />} label="Auditoria sync" />
          </nav>
          <div className="mt-auto border-t border-slate-200 p-4">
            <Link
              href="/"
              className="flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-extrabold text-slate-800 hover:bg-slate-50"
            >
              Modo campo
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase text-teal-700">Panel administrativo</p>
                <h2 className="text-2xl font-black tracking-normal">Operacion sincronizada</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={overview.source === "database" ? "teal" : "amber"}>
                  {overview.source === "database" ? "Datos reales" : "Datos demo"}
                </Badge>
                <Badge tone="slate">Actualizado {formatDateTime(overview.generatedAt)}</Badge>
              </div>
            </div>
          </header>

          <div className="grid gap-5 px-4 py-5 lg:px-6">
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {overview.metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1.45fr]">
              <Panel title="Estado de viajes" icon={<Truck className="h-5 w-5" />}>
                <div className="grid gap-4">
                  {overview.tripStatus.map((slice) => (
                    <StatusBar key={slice.label} slice={slice} />
                  ))}
                </div>
              </Panel>

              <Panel title="Costo operativo por maquinaria" icon={<Fuel className="h-5 w-5" />}>
                <FuelReport rows={overview.fuelReport} />
              </Panel>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
              <Panel title="Viajes recientes" icon={<ClipboardList className="h-5 w-5" />}>
                <TripsTable rows={overview.recentTrips} />
              </Panel>

              <Panel title="Partes diarios" icon={<Gauge className="h-5 w-5" />}>
                <WorkOrdersTable rows={overview.recentWorkOrders} />
              </Panel>
            </section>

            <section className="grid gap-5 xl:grid-cols-3">
              <Panel title="Choferes" icon={<Users className="h-5 w-5" />}>
                <SimpleList
                  rows={overview.drivers.map((driver) => ({
                    title: driver.name,
                    detail: `${driver.trips} viajes registrados`,
                    meta: driver.email
                  }))}
                />
              </Panel>

              <Panel title="Maquinarias" icon={<Tractor className="h-5 w-5" />}>
                <AssetList rows={overview.assets} />
              </Panel>

              <Panel title="Clientes" icon={<BarChart3 className="h-5 w-5" />}>
                <CustomerReport rows={overview.customerReport} />
              </Panel>
            </section>

            <Panel title="Auditoria de sincronizacion" icon={<RefreshCw className="h-5 w-5" />}>
              <SyncAudit rows={overview.syncAudit} />
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3",
        active ? "bg-teal-700 text-white" : "hover:bg-slate-100"
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-slate-600">{metric.label}</p>
          <p className="mt-2 text-2xl font-black">{metric.value}</p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-md",
            getMetricToneClass(metric.tone)
          )}
        >
          {metric.tone === "red" ? <AlertTriangle className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-slate-600">{metric.detail}</span>
        <span className="text-teal-700">{metric.trend}</span>
      </div>
    </article>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-teal-700">{icon}</div>
          <h3 className="text-base font-black">{title}</h3>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatusBar({ slice }: { slice: StatusSlice }) {
  const percent = Math.round((slice.value / slice.total) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm font-extrabold">
        <span>{slice.label}</span>
        <span>{integerFormatter.format(slice.value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
        <div
          className={cn("h-full rounded-sm", getStatusToneClass(slice.tone))}
          style={{ width: `${Math.max(percent, slice.value > 0 ? 8 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function FuelReport({ rows }: { rows: FuelReportRow[] }) {
  const maxFuel = Math.max(...rows.map((row) => row.fuelLiters), 1);

  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.machinery} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
            <span className="truncate">{row.machinery}</span>
            <span>{numberFormatter.format(row.litersPerHa)} L/ha</span>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm bg-sky-600"
                style={{ width: `${Math.max((row.fuelLiters / maxFuel) * 100, 8)}%` }}
              />
            </div>
            <span className="w-28 text-right text-xs font-bold text-slate-600">
              {currencyFormatter.format(row.estimatedCost)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TripsTable({ rows }: { rows: TripTableRow[] }) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-3">Patente</th>
            <th className="py-2 pr-3">Chofer</th>
            <th className="py-2 pr-3">Producto</th>
            <th className="py-2 pr-3">Kg</th>
            <th className="py-2 pr-3">Estado</th>
            <th className="py-2 pr-3">Destino</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-3 pr-3 font-black">{row.licensePlate}</td>
              <td className="py-3 pr-3 font-bold text-slate-700">{row.driverName}</td>
              <td className="py-3 pr-3">{row.product}</td>
              <td className="py-3 pr-3">{integerFormatter.format(row.estimatedKg)}</td>
              <td className="py-3 pr-3">
                <TripStatusBadge status={row.status} />
              </td>
              <td className="py-3 pr-3 text-slate-600">{row.destination}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkOrdersTable({ rows }: { rows: WorkOrderTableRow[] }) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{row.machinery}</p>
              <p className="mt-1 text-xs font-bold text-slate-600">
                {row.operatorName} · {row.plot}
              </p>
            </div>
            <span className="shrink-0 rounded-sm bg-slate-100 px-2 py-1 text-xs font-black">
              {numberFormatter.format(row.hectaresWorked)} ha
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{row.customer}</span>
            <span>{numberFormatter.format(row.fuelLiters)} L</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleList({ rows }: { rows: Array<{ title: string; detail: string; meta: string }> }) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.title} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{row.title}</p>
            <p className="mt-1 text-xs font-bold text-slate-600">{row.detail}</p>
          </div>
          <span className="shrink-0 text-xs font-bold text-slate-500">{row.meta}</span>
        </div>
      ))}
    </div>
  );
}

function AssetList({ rows }: { rows: AssetRow[] }) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.name} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-black">{row.name}</p>
            <Badge tone={row.status === "Activo" ? "teal" : "amber"}>{row.status}</Badge>
          </div>
          <p className="mt-1 text-xs font-bold text-slate-600">{row.owner}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">
            {numberFormatter.format(row.hectares)} ha · {numberFormatter.format(row.fuelLiters)} L ·{" "}
            {row.records} partes
          </p>
        </div>
      ))}
    </div>
  );
}

function CustomerReport({ rows }: { rows: CustomerReportRow[] }) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <div key={row.customer}>
          <div className="mb-2 flex items-center justify-between gap-3 text-sm font-extrabold">
            <span className="truncate">{row.customer}</span>
            <span>{numberFormatter.format(row.hectares)} ha</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>{row.workOrders} partes diarios</span>
            <span>{numberFormatter.format(row.fuelLiters)} L</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SyncAudit({ rows }: { rows: SyncAuditRow[] }) {
  if (rows.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-3">Estado</th>
            <th className="py-2 pr-3">Entidad</th>
            <th className="py-2 pr-3">Registro</th>
            <th className="py-2 pr-3">Mensaje</th>
            <th className="py-2 pr-3">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="py-3 pr-3">
                <Badge tone={row.status === "SUCCESS" ? "teal" : "red"}>
                  {row.status === "SUCCESS" ? "OK" : "Revisar"}
                </Badge>
              </td>
              <td className="py-3 pr-3 font-bold">{row.entityType === "TRIP" ? "Viaje" : "Parte"}</td>
              <td className="py-3 pr-3 font-mono text-xs text-slate-600">{row.entityId ?? "Sin ID"}</td>
              <td className="py-3 pr-3 text-slate-700">{row.message}</td>
              <td className="py-3 pr-3 text-slate-600">{formatDateTime(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TripStatusBadge({ status }: { status: TripTableRow["status"] }) {
  if (status === "COMPLETED") {
    return <Badge tone="teal">Completado</Badge>;
  }

  if (status === "IN_TRANSIT") {
    return <Badge tone="sky">En viaje</Badge>;
  }

  return <Badge tone="amber">Pendiente</Badge>;
}

function Badge({ tone, children }: { tone: "teal" | "sky" | "amber" | "red" | "slate"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-sm px-2 text-xs font-black",
        tone === "teal" && "bg-teal-50 text-teal-800",
        tone === "sky" && "bg-sky-50 text-sky-800",
        tone === "amber" && "bg-amber-100 text-amber-900",
        tone === "red" && "bg-red-50 text-red-800",
        tone === "slate" && "bg-slate-100 text-slate-700"
      )}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-24 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
      Sin registros para mostrar
    </div>
  );
}

function getMetricToneClass(tone: DashboardMetric["tone"]) {
  const classes = {
    teal: "bg-teal-700 text-white",
    sky: "bg-sky-600 text-white",
    amber: "bg-amber-300 text-slate-950",
    red: "bg-red-600 text-white",
    slate: "bg-slate-200 text-slate-800"
  };

  return classes[tone];
}

function getStatusToneClass(tone: StatusSlice["tone"]) {
  const classes = {
    teal: "bg-teal-700",
    sky: "bg-sky-600",
    amber: "bg-amber-400"
  };

  return classes[tone];
}

function formatDateTime(value: string) {
  if (value === "Sin actividad") {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
