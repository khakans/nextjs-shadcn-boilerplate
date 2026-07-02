import { DashboardShell } from "./components/dashboard-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await requireCurrentUser();

  return <DashboardShell user={user} />;
}
