import type { Metadata } from "next";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getDashboardOverview } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel Administrativo | Agro Operativo",
  description: "Backoffice AgTech para viajes, partes diarios, costos operativos y auditoria de sincronizacion."
};

export default async function DashboardPage({ searchParams }: { searchParams?: { view?: string } }) {
  const overview = await getDashboardOverview();
  const view = searchParams?.view ?? "summary";

  return <AdminDashboard overview={overview} initialView={view} />;
}
