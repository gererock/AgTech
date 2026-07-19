import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getDashboardOverview } from "@/lib/dashboard-data";

export default async function UsersPage() {
  const overview = await getDashboardOverview();

  return <AdminDashboard overview={overview} initialView="users" />;
}
