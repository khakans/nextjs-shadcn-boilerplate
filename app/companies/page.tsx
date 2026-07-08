import { CompaniesShell } from "@/features/companies/components/companies-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function CompaniesPage() {
  const user = await requireCurrentUser();

  return <CompaniesShell user={user} />;
}
