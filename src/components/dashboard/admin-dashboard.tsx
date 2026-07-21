"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Fuel,
  Gauge,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
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
import { clearAuthSession } from "@/lib/auth";
import { getRoleLabel } from "@/lib/role-labels";
import { cn } from "@/lib/utils";
import { EntityManager } from "@/components/dashboard/entity-manager";
import { DailyOpsView } from "@/components/dashboard/daily-ops-view";
import type { AppRole } from "@/lib/authz";

interface AdminDashboardProps {
  overview: DashboardOverview;
  initialView?: string;
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

export function AdminDashboard({ overview, initialView = "summary" }: AdminDashboardProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(initialView);
  const [profile, setProfile] = useState<{ id: string; name: string; email: string; role: AppRole } | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const mobileProfileMenuRef = useRef<HTMLDivElement>(null);
  const desktopProfileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.replace("/login");
          return;
        }

        const data = await response.json();
        setProfile(data.user);
      } catch (error) {
        console.error(error);
        router.replace("/login");
      }
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideMobileMenu = mobileProfileMenuRef.current?.contains(target);
      const isInsideDesktopMenu = desktopProfileMenuRef.current?.contains(target);

      if (!isInsideMobileMenu && !isInsideDesktopMenu) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearAuthSession();
      router.replace("/login");
    }
  };

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
  };

  const canManageUsers = profile?.role === "ADMIN";
  const canManageAllOperations = profile?.role === "ADMIN";

  return (
    <div className="mobile-shell min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className={cn("border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:min-h-screen lg:shrink-0 lg:border-b-0 lg:border-r lg:flex lg:flex-col", isSidebarCollapsed ? "w-full lg:w-20" : "w-full lg:w-64", !isSidebarCollapsed ? "block" : "hidden lg:flex")}> 
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
            <div className={cn("min-w-0", isSidebarCollapsed && "hidden")}> 
              <p className="text-xs font-extrabold uppercase text-teal-700">Agro Operativo</p>
              <h1 className="mt-1 text-xl font-black">Backoffice</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100 lg:flex"
              aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <nav className="grid gap-1 overflow-y-auto p-2 text-sm font-bold text-slate-700 sm:p-3" aria-label="Secciones del panel">
            <SidebarItem
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Resumen"
              active={activeSection === "summary"}
              onClick={() => handleSectionChange("summary")}
              href="/dashboard?view=summary"
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem
              icon={<Activity className="h-4 w-4" />}
              label="Operación del día"
              active={activeSection === "operations"}
              onClick={() => handleSectionChange("operations")}
              href="/dashboard?view=operations"
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem
              icon={<Truck className="h-4 w-4" />}
              label="Viajes"
              active={activeSection === "trips"}
              onClick={() => handleSectionChange("trips")}
              href="/dashboard?view=trips"
              collapsed={isSidebarCollapsed}
            />
            <SidebarItem
              icon={<Tractor className="h-4 w-4" />}
              label="Partes"
              active={activeSection === "work-orders"}
              onClick={() => handleSectionChange("work-orders")}
              href="/dashboard?view=work-orders"
              collapsed={isSidebarCollapsed}
            />
            {canManageUsers ? (
              <SidebarItem
                icon={<Users className="h-4 w-4" />}
                label="Usuarios"
                active={activeSection === "users"}
                onClick={() => handleSectionChange("users")}
                href="/dashboard?view=users"
                collapsed={isSidebarCollapsed}
              />
            ) : null}
            {canManageAllOperations ? (
              <SidebarItem
                icon={<RefreshCw className="h-4 w-4" />}
                label="Auditoria sync"
                active={activeSection === "sync-audit"}
                onClick={() => handleSectionChange("sync-audit")}
                href="/dashboard?view=sync-audit"
                collapsed={isSidebarCollapsed}
              />
            ) : null}
          </nav>
          {profile ? (
            <div className="border-t border-slate-200 p-3 lg:hidden" ref={mobileProfileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-black text-white">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{profile.name}</p>
                  <p className="truncate text-xs font-bold text-slate-600">{profile.email}</p>
                </div>
              </button>

              {isProfileMenuOpen ? (
                <div className="mt-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm">
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-black text-slate-900">{profile.name}</p>
                    <p className="truncate text-slate-600">{profile.email}</p>
                    <p className="mt-1 text-xs font-bold text-teal-700">{getRoleLabel(profile.role)}</p>
                  </div>
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center justify-start rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Cerrar sesión
                    </button>
                    <Link
                      href="/"
                      className="flex w-full items-center justify-start rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      Modo campo
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>

        <main id="summary" className="min-w-0 flex-1">
          <header className="relative sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-4 lg:px-6">
            {isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
                className="absolute right-3 top-3 z-50 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 lg:hidden"
                aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            ) : null}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase text-teal-700">Panel administrativo</p>
                <h2 className="text-xl font-black tracking-normal sm:text-2xl">
                  {activeSection === "summary"
                    ? "Operación sincronizada"
                    : activeSection === "operations"
                      ? "Operación del día"
                      : activeSection === "trips"
                        ? "Viajes"
                        : activeSection === "work-orders"
                          ? "Partes diarios"
                          : activeSection === "users"
                            ? "Usuarios"
                            : "Auditoría de sincronización"}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="teal" className="w-full justify-center sm:w-auto">
                  Datos reales
                </Badge>
                <Badge tone="slate" className="w-full justify-center sm:w-auto">Actualizado {formatDateTime(overview.generatedAt)}</Badge>
                {profile ? (
                  <div className="relative hidden lg:block" ref={desktopProfileMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsProfileMenuOpen((open) => !open)}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:bg-slate-100 max-sm:w-full max-sm:justify-start"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-black text-white">
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{profile.name}</p>
                        <p className="truncate text-xs font-bold text-slate-600">{profile.email}</p>
                      </div>
                    </button>

                    {isProfileMenuOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
                          <p className="font-black text-slate-900">{profile.name}</p>
                          <p className="truncate text-slate-600">{profile.email}</p>
                          <p className="mt-1 text-xs font-bold text-teal-700">{getRoleLabel(profile.role)}</p>
                        </div>
                        <div className="mt-2 space-y-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center justify-start rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Cerrar sesión
                          </button>
                          <Link
                            href="/"
                            className="flex w-full items-center justify-start rounded-md px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Modo campo
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-5 px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
            {activeSection === "summary" ? (
              <>
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {overview.metrics.map((metric) => (
                    <MetricCard key={metric.label} metric={metric} />
                  ))}
                </section>

                <section id="trips" className="grid gap-5 2xl:grid-cols-[1fr_1.45fr]">
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

                <section className="grid gap-5 2xl:grid-cols-[1.3fr_1fr]">
                  <Panel title="Viajes recientes" icon={<ClipboardList className="h-5 w-5" />}>
                    <TripsTable rows={overview.recentTrips} />
                  </Panel>

                  <Panel title="Partes diarios" icon={<Gauge className="h-5 w-5" />}>
                    <WorkOrdersTable rows={overview.recentWorkOrders} />
                  </Panel>
                </section>

                <section className="grid gap-5 2xl:grid-cols-3">
                  <Panel title="Conductores" icon={<Users className="h-5 w-5" />}>
                    <SimpleList
                      rows={overview.drivers.map((driver) => ({
                        title: driver.name,
                        detail: `${driver.trips} viajes registrados`,
                        meta: driver.email
                      }))}
                    />
                  </Panel>

                  <Panel id="machinery" title="Maquinarias" icon={<Tractor className="h-5 w-5" />}>
                    <AssetList rows={overview.assets} />
                  </Panel>

                  <Panel id="customers" title="Clientes" icon={<BarChart3 className="h-5 w-5" />}>
                    <CustomerReport rows={overview.customerReport} />
                  </Panel>
                </section>

                <Panel id="sync-audit" title="Auditoría de sincronización" icon={<RefreshCw className="h-5 w-5" />}>
                  <SyncAudit rows={overview.syncAudit} />
                </Panel>
              </>
            ) : null}

            {activeSection === "operations" ? (
              <DailyOpsView />
            ) : null}

            {activeSection === "trips" ? (
              <div id="trips" className="scroll-mt-24">
                <EntityManager kind="trips" />
              </div>
            ) : null}

            {activeSection === "work-orders" ? (
              <div id="work-orders" className="scroll-mt-24">
                <EntityManager kind="work-orders" />
              </div>
            ) : null}

            {activeSection === "users" && canManageUsers ? (
              <div id="users" className="scroll-mt-24">
                <EntityManager kind="users" />
              </div>
            ) : null}

            {activeSection === "sync-audit" && canManageAllOperations ? (
              <Panel id="sync-audit" title="Auditoría de sincronización" icon={<RefreshCw className="h-5 w-5" />}>
                <SyncAudit rows={overview.syncAudit} />
              </Panel>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
  href,
  collapsed = false
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  href: string;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-left",
        active ? "bg-teal-700 text-white" : "hover:bg-slate-100",
        collapsed && "justify-center px-2"
      )}
      title={label}
    >
      {icon}
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </Link>
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

function Panel({ id, title, icon, children }: { id?: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-md border border-slate-200 bg-white shadow-sm">
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
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-black">{row.licensePlate}</p>
              <p className="text-sm text-slate-600">{row.driverName}</p>
            </div>
            <TripStatusBadge status={row.status} />
          </div>
          <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
            <span>{row.product}</span>
            <span className="sm:text-right">{integerFormatter.format(row.estimatedKg)} kg</span>
            <span className="sm:col-span-2">{row.destination}</span>
          </div>
        </div>
      ))}
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
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone={row.status === "SUCCESS" ? "teal" : "red"}>
              {row.status === "SUCCESS" ? "OK" : "Revisar"}
            </Badge>
            <span className="text-sm font-black text-slate-700">
              {row.entityType === "TRIP" ? "Viaje" : "Parte"}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p className="font-mono text-xs">{row.entityId ?? "Sin ID"}</p>
            <p>{row.message}</p>
            <p className="text-xs font-bold text-slate-500">{formatDateTime(row.createdAt)}</p>
          </div>
        </div>
      ))}
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

function Badge({ tone, children, className }: { tone: "teal" | "sky" | "amber" | "red" | "slate"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-sm px-2 text-xs font-black",
        tone === "teal" && "bg-teal-50 text-teal-800",
        tone === "sky" && "bg-sky-50 text-sky-800",
        tone === "amber" && "bg-amber-100 text-amber-900",
        tone === "red" && "bg-red-50 text-red-800",
        tone === "slate" && "bg-slate-100 text-slate-700",
        className
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

  const formatted = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(new Date(value));

  return formatted.replace(/[\u00A0\u202F]/g, " ");
}
