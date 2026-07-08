"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { AuthUser } from "@/lib/auth"
import { getMessages } from "@/lib/i18n"
import { useLanguagePreference } from "@/lib/theme"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon } from "lucide-react"

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: AuthUser
}) {
  const pathname = usePathname()
  const { language } = useLanguagePreference()
  const t = getMessages(language)
  const isCompaniesActive = isActivePath(pathname, "/companies")
  const data = {
    user,
    teams: [
      {
        name: "Acme Inc",
        logo: (
          <GalleryVerticalEndIcon
          />
        ),
        plan: "Enterprise",
      },
      {
        name: "Acme Corp.",
        logo: (
          <AudioLinesIcon
          />
        ),
        plan: "Startup",
      },
      {
        name: "Evil Corp.",
        logo: (
          <TerminalIcon
          />
        ),
        plan: "Free",
      },
    ],
    navMain: [
      {
        title: t.settings,
        url: "#",
        icon: (
          <Settings2Icon
          />
        ),
        isActive: isCompaniesActive,
        items: [
          {
            title: t.general,
            url: "#",
          },
          {
            isActive: isCompaniesActive,
            title: t.companies,
            url: "/companies",
          },
          {
            title: t.teams,
            url: "#",
          },
          {
            title: t.billing,
            url: "#",
          },
          {
            title: t.limits,
            url: "#",
          },
        ],
      },
    ],
    projects: [
      {
        name: "Design Engineering",
        url: "#",
        icon: (
          <FrameIcon
          />
        ),
      },
      {
        name: "Sales & Marketing",
        url: "#",
        icon: (
          <PieChartIcon
          />
        ),
      },
      {
        name: "Travel",
        url: "#",
        icon: (
          <MapIcon
          />
        ),
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher labels={{ addTeam: t.addTeam, teams: t.teams }} teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groupLabel={t.platform} items={data.navMain} />
        <NavProjects
          labels={{
            deleteProject: t.deleteProject,
            more: t.more,
            projects: t.projects,
            shareProject: t.shareProject,
            viewProject: t.viewProject,
          }}
          projects={data.projects}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function isActivePath(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`)
}
