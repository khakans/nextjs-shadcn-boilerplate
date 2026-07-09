import { TeamDetailShell } from "@/features/teams/components/teams-shell";
import { requireCurrentUser } from "@/lib/auth";
import { notFound } from "next/navigation";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  if (!uuidPattern.test(teamId)) {
    notFound();
  }

  const user = await requireCurrentUser();

  return <TeamDetailShell teamId={teamId} user={user} />;
}
