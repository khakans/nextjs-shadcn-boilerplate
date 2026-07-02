"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

export function DashboardShell() {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const breadcrumbItems = [
    {
      label: t.buildYourApplication,
      href: "#",
    },
    {
      label: t.dataFetching,
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <PageBreadcrumb items={breadcrumbItems} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl border border-primary/15 bg-primary/10" />
            <div className="aspect-video rounded-xl border border-primary/15 bg-primary/10" />
            <div className="aspect-video rounded-xl border border-primary/15 bg-primary/10" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl border border-primary/15 bg-primary/10 md:min-h-min" />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
