"use client";

import * as React from "react";
import { AlertCircleIcon } from "lucide-react";

import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getProfile } from "@/features/profile/api/profile-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

import { DangerZoneCard } from "./danger-zone-card";
import { PersonalInfoForm } from "./personal-info-form";
import { BillingCard, NotificationsCard, PrivacyCard } from "./preference-cards";
import { ProfilePhotoCard } from "./profile-photo-card";
import { SecurityCard } from "./security-card";
import type { ProfileSettingsUser } from "./settings-utils";

const navItems = [
  {
    id: "profile",
    labelKey: "profile",
  },
  {
    id: "security",
    labelKey: "profileNavAccountSecurity",
  },
  {
    id: "notifications",
    labelKey: "profileNavNotifications",
  },
  {
    id: "privacy",
    labelKey: "profileNavPrivacy",
  },
  {
    id: "billing",
    labelKey: "billing",
  },
  {
    id: "danger-zone",
    labelKey: "profileNavDangerZone",
  },
] as const;

type SettingsSectionId = (typeof navItems)[number]["id"];
type SettingsNavLabelKey = (typeof navItems)[number]["labelKey"];

export function ProfileSettingsShell({
  initialUser,
}: {
  initialUser: ProfileSettingsUser;
}) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const [user, setUser] = React.useState<ProfileSettingsUser>(initialUser);
  const [activeSection, setActiveSection] =
    React.useState<SettingsSectionId>("profile");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const fetchProfile = React.useCallback(async () => {
    const payload = await getProfile();
    setUser(payload.user);
  }, []);

  const retryProfile = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchProfile();
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, t.profileLoadFailed));
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfile, t.profileLoadFailed]);

  React.useEffect(() => {
    let isMounted = true;

    async function loadInitialProfile() {
      try {
        const payload = await getProfile();

        if (isMounted) {
          setUser(payload.user);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, t.profileLoadFailed));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialProfile();

    return () => {
      isMounted = false;
    };
  }, [t.profileLoadFailed]);

  const updateActiveSection = React.useCallback(() => {
    if (isLoading || error) {
      return;
    }

    const activationOffset = 120;
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const activeSection =
      [...sections]
        .reverse()
        .find(
          (section) => section.getBoundingClientRect().top <= activationOffset,
        ) ?? sections[0];

    setActiveSection(activeSection.id as SettingsSectionId);
  }, [error, isLoading]);

  const scheduleActiveSectionUpdate = React.useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      animationFrameRef.current = null;
      updateActiveSection();
    });
  }, [updateActiveSection]);

  React.useEffect(() => {
    if (isLoading || error) {
      return;
    }

    scheduleActiveSectionUpdate();
    window.addEventListener("scroll", scheduleActiveSectionUpdate, {
      passive: true,
    });
    document.addEventListener("scroll", scheduleActiveSectionUpdate, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", scheduleActiveSectionUpdate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("scroll", scheduleActiveSectionUpdate);
      document.removeEventListener("scroll", scheduleActiveSectionUpdate, {
        capture: true,
      });
      window.removeEventListener("resize", scheduleActiveSectionUpdate);
    };
  }, [error, isLoading, scheduleActiveSectionUpdate]);

  function scrollToSection(sectionId: SettingsSectionId) {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

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
            <PageBreadcrumb items={[{ label: t.profileSettingsTitle }]} />
          </div>
          <div className="ml-auto px-4">
            <LanguageSwitcher />
          </div>
        </header>

        <main
          className="flex flex-1 flex-col gap-6 p-4 md:p-6"
          onScrollCapture={scheduleActiveSectionUpdate}
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              {t.profileSettingsTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t.profileSettingsDescription}
            </p>
          </div>

          {isLoading ? (
            <SettingsSkeleton />
          ) : error ? (
            <ProfileErrorState message={error} onRetry={retryProfile} t={t} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <SettingsNav
                activeSection={activeSection}
                onSelect={scrollToSection}
                t={t}
              />
              <div className="grid min-w-0 gap-6">
                <section id="profile" className="scroll-mt-20 grid gap-6">
                  <ProfilePhotoCard onUserChange={setUser} user={user} />
                  <PersonalInfoForm onUserChange={setUser} user={user} />
                </section>
                <SecurityCard />
                <NotificationsCard />
                <PrivacyCard />
                <BillingCard />
                <DangerZoneCard user={user} />
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SettingsNav({
  activeSection,
  onSelect,
  t,
}: {
  activeSection: SettingsSectionId;
  onSelect: (sectionId: SettingsSectionId) => void;
  t: ReturnType<typeof getMessages>;
}) {
  return (
    <aside className="hidden lg:sticky lg:top-4 lg:block lg:self-start">
      <nav
        aria-label="Settings sections"
        className="scrollbar-minimal flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
      >
        {navItems.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={activeSection === item.id ? "secondary" : "ghost"}
            data-active={activeSection === item.id ? true : undefined}
            className="justify-start data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary/90"
            onClick={() => onSelect(item.id)}
          >
            {t[item.labelKey as SettingsNavLabelKey]}
          </Button>
        ))}
      </nav>
    </aside>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="hidden lg:grid lg:gap-2">
        {navItems.map((item) => (
          <Skeleton key={item.id} className="h-8 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

function ProfileErrorState({
  message,
  onRetry,
  t,
}: {
  message: string;
  onRetry: () => void;
  t: ReturnType<typeof getMessages>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-destructive sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <div>
          <h2 className="text-sm font-medium">{t.unableToLoadProfile}</h2>
          <p className="mt-1 text-sm">{message}</p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onRetry}>
        {t.retry}
      </Button>
    </div>
  );
}
