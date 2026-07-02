"use client"

import * as React from "react"

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
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon } from "lucide-react"

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: AuthUser
}) {
  const { language } = useLanguagePreference()
  const t = getMessages(language)
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
        title: t.playground,
        url: "#",
        icon: (
          <TerminalSquareIcon
          />
        ),
        isActive: true,
        items: [
          {
            title: t.history,
            url: "#",
          },
          {
            title: t.starred,
            url: "#",
          },
          {
            title: t.settings,
            url: "#",
          },
        ],
      },
      {
        title: t.models,
        url: "#",
        icon: (
          <BotIcon
          />
        ),
        items: [
          {
            title: "Genesis",
            url: "#",
          },
          {
            title: "Explorer",
            url: "#",
          },
          {
            title: "Quantum",
            url: "#",
          },
        ],
      },
      {
        title: t.documentation,
        url: "#",
        icon: (
          <BookOpenIcon
          />
        ),
        items: [
          {
            title: t.introduction,
            url: "#",
          },
          {
            title: t.getStarted,
            url: "#",
          },
          {
            title: t.tutorials,
            url: "#",
          },
          {
            title: t.changelog,
            url: "#",
          },
        ],
      },
      {
        title: t.settings,
        url: "#",
        icon: (
          <Settings2Icon
          />
        ),
        items: [
          {
            title: t.general,
            url: "#",
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
