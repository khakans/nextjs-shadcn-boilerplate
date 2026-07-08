import { ProfileSettingsShell } from "@/components/settings/profile-settings-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireCurrentUser();

  return <ProfileSettingsShell initialUser={user} />;
}
