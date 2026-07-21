import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { getCurrentUser } from "@/lib/authz";
import { getDashboardOverview } from "@/lib/dashboard-data";

export default async function WorkOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "DRIVER") {
    redirect("/dashboard?view=trips");
  }

  const overview = await getDashboardOverview();

  return <AdminDashboard overview={overview} initialView="work-orders" initialProfile={user} />;
}
