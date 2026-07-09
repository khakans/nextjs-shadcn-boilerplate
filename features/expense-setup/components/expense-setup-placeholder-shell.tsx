"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/lib/auth";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

type ExpenseSetupPlaceholderShellProps = {
  page: "categories" | "currency" | "paymentMethods";
  user: AuthUser;
};

export function ExpenseSetupPlaceholderShell({
  page,
  user,
}: ExpenseSetupPlaceholderShellProps) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const pageCopy = getPageCopy(t, page);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <PageBreadcrumb
              items={[
                { label: t.expenseSetup, href: "#" },
                { label: pageCopy.title },
              ]}
            />
          </div>
          <div className="ml-auto px-4">
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              {pageCopy.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {pageCopy.description}
            </p>
          </div>

          <div className="min-h-[360px] rounded-lg border border-dashed bg-muted/20" />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function getPageCopy(
  t: ReturnType<typeof getMessages>,
  page: ExpenseSetupPlaceholderShellProps["page"],
) {
  if (page === "categories") {
    return {
      description: t.categoriesDescription,
      title: t.categories,
    };
  }

  if (page === "currency") {
    return {
      description: t.currencyDescription,
      title: t.currency,
    };
  }

  return {
    description: t.paymentMethodsDescription,
    title: t.paymentMethods,
  };
}
