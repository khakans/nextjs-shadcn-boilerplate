import { DashboardShell } from "@/app/dashboard/components/dashboard-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireCurrentUser();

  return <DashboardShell user={user} />;
}
