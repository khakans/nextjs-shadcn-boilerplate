"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { getMessages } from "@/lib/i18n"
import {
  useAccentColor,
  useLanguagePreference,
  useThemeMode,
  type AccentColor,
  type LanguagePreference,
  type ThemeMode,
} from "@/lib/theme"
import {
  ChevronsUpDownIcon,
  BadgeCheckIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  PaletteIcon,
  GlobeIcon,
} from "lucide-react"

const accentOptions: {
  labelKey: "blue" | "red" | "orange" | "purple" | "neutral"
  value: AccentColor
  swatchClassName: string
}[] = [
  {
    labelKey: "blue",
    value: "blue",
    swatchClassName: "bg-blue-600",
  },
  {
    labelKey: "red",
    value: "red",
    swatchClassName: "bg-red-600",
  },
  {
    labelKey: "orange",
    value: "orange",
    swatchClassName: "bg-orange-500",
  },
  {
    labelKey: "purple",
    value: "purple",
    swatchClassName: "bg-purple-600",
  },
  {
    labelKey: "neutral",
    value: "neutral",
    swatchClassName: "bg-neutral-700 dark:bg-neutral-300",
  },
]

const languageOptions: {
  labelKey: "english" | "indonesia"
  value: LanguagePreference
}[] = [
  {
    labelKey: "english",
    value: "en",
  },
  {
    labelKey: "indonesia",
    value: "id",
  },
]

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const { mode, setMode } = useThemeMode()
  const { accent, setAccent } = useAccentColor()
  const { language, setLanguage } = useLanguagePreference()
  const t = getMessages(language)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheckIcon
                />
                {t.account}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <PaletteIcon />
                  {t.preference}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  side={isMobile ? "bottom" : "right"}
                  align="start"
                  sideOffset={8}
                  className="min-w-40"
                >
                  <DropdownMenuLabel>{t.theme}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={mode}
                    onValueChange={(value) => setMode(value as ThemeMode)}
                  >
                    <DropdownMenuRadioItem value="system">
                      <MonitorIcon />
                      {t.system}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light">
                      <SunIcon />
                      {t.light}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">
                      <MoonIcon />
                      {t.dark}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t.accent}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={accent}
                    onValueChange={(value) => setAccent(value as AccentColor)}
                  >
                    {accentOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-3 rounded-full ${option.swatchClassName}`}
                        />
                        {t[option.labelKey]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{t.language}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={language}
                    onValueChange={(value) =>
                      setLanguage(value as LanguagePreference)
                    }
                  >
                    {languageOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value}
                        value={option.value}
                      >
                        <GlobeIcon />
                        {t[option.labelKey]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOutIcon
              />
              {t.logOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
