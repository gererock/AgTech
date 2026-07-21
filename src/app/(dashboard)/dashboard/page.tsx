import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getCurrentUser } from "@/lib/authz";
import { getDashboardOverview } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel Administrativo | Agro Operativo",
  description: "Backoffice AgTech para viajes, partes diarios, costos operativos y auditoria de sincronizacion."
};

export default async function DashboardPage({ searchParams }: { searchParams?: { view?: string } }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const view = searchParams?.view ?? (user.role === "DRIVER" ? "trips" : "summary");

  if (user.role === "DRIVER" && (view === "summary" || view === "work-orders")) {
    redirect("/dashboard?view=trips");
  }

  const overview = await getDashboardOverview();

  return <AdminDashboard overview={overview} initialView={view} initialProfile={user} />;
}
