import { TeamsShell } from "@/features/teams/components/teams-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function TeamsPage() {
  const user = await requireCurrentUser();

  return <TeamsShell user={user} />;
}
