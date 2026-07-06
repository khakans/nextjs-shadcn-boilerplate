import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireCurrentUser();

  return <DashboardShell user={user} />;
}
