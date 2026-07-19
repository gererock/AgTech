import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getDashboardOverview } from "@/lib/dashboard-data";

export default async function TripsPage() {
  const overview = await getDashboardOverview();

  return <AdminDashboard overview={overview} initialView="trips" />;
}
