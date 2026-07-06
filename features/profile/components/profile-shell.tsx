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
import {
  AccountInfoSection,
  AvatarProfileSection,
  DeleteAccountSection,
  PasswordSection,
} from "@/features/profile/components/profile-sections";
import { useProfileSettings } from "@/features/profile/hooks/use-profile-settings";
import type { AuthUser } from "@/lib/auth";

export function ProfileShell({ user }: { user: AuthUser }) {
  const profile = useProfileSettings(user);

  return (
    <SidebarProvider>
      <AppSidebar user={profile.profileUser} />
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
                {
                  label: profile.t.profile,
                },
              ]}
            />
          </div>
          <div className="ml-auto px-4">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <AvatarProfileSection
            avatarError={profile.avatarError}
            avatarSuccess={profile.avatarSuccess}
            fileInputRef={profile.fileInputRef}
            isUploadingAvatar={profile.isUploadingAvatar}
            onAvatarChange={profile.handleAvatarChange}
            t={profile.t}
            user={profile.profileUser}
          />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <AccountInfoSection t={profile.t} user={profile.profileUser} />
            <PasswordSection
              error={profile.passwordError}
              formRef={profile.passwordFormRef}
              isPending={profile.isChangingPassword}
              onSubmit={profile.handlePasswordSubmit}
              success={profile.passwordSuccess}
              t={profile.t}
            />
          </div>

          <DeleteAccountSection
            confirmation={profile.deleteConfirmation}
            error={profile.deleteError}
            isPending={profile.isDeleting}
            onConfirmationChange={profile.setDeleteConfirmation}
            onDeleteAccount={profile.handleDeleteAccount}
            t={profile.t}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
