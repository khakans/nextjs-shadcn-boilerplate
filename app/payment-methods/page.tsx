import { ExpenseSetupPlaceholderShell } from "@/features/expense-setup/components/expense-setup-placeholder-shell";
import { requireCurrentUser } from "@/lib/auth";

export default async function PaymentMethodsPage() {
  const user = await requireCurrentUser();

  return <ExpenseSetupPlaceholderShell page="paymentMethods" user={user} />;
}
