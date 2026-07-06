import { ProfileShell } from "@/features/profile/components/profile-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  return <ProfileShell user={user} />;
}
