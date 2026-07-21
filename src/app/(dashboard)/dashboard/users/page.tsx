import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getCurrentUser } from "@/lib/authz";
import { getDashboardOverview } from "@/lib/dashboard-data";

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const overview = await getDashboardOverview();

  return <AdminDashboard overview={overview} initialView="users" initialProfile={user} />;
}
