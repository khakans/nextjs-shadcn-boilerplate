"use client"

import * as React from "react"
import { CameraIcon, LockKeyholeIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { PageBreadcrumb } from "@/components/page-breadcrumb"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { AuthUser } from "@/lib/auth"
import { getMessages } from "@/lib/i18n"
import { useLanguagePreference } from "@/lib/theme"

const maxAvatarSize = 5 * 1024 * 1024
const allowedAvatarTypes = new Set(["image/jpeg", "image/png"])

export function ProfileShell({ user }: { user: AuthUser }) {
  const router = useRouter()
  const { language } = useLanguagePreference()
  const t = getMessages(language)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const passwordFormRef = React.useRef<HTMLFormElement>(null)
  const [profileUser, setProfileUser] = React.useState(user)
  const [avatarError, setAvatarError] = React.useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = React.useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("")
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setAvatarError(null)
    setAvatarSuccess(null)

    if (!allowedAvatarTypes.has(file.type)) {
      setAvatarError(t.avatarInvalidType)
      event.target.value = ""
      return
    }

    if (file.size > maxAvatarSize) {
      setAvatarError(t.avatarMaxSize)
      event.target.value = ""
      return
    }

    const formData = new FormData()
    formData.append("avatar", file)
    setIsUploadingAvatar(true)

    const response = await fetch("/api/profile/avatar", {
      method: "POST",
      body: formData,
    })
    const payload = await response.json().catch(() => null)

    setIsUploadingAvatar(false)
    event.target.value = ""

    if (!response.ok) {
      setAvatarError(payload?.error ?? t.avatarChangeFailed)
      return
    }

    setProfileUser(payload.user)
    setAvatarSuccess(t.avatarChanged)
    router.refresh()
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    const formData = new FormData(event.currentTarget)
    const currentPassword = String(formData.get("currentPassword") ?? "")
    const newPassword = String(formData.get("newPassword") ?? "")
    const confirmPassword = String(formData.get("confirmPassword") ?? "")

    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordConfirmationMismatch)
      return
    }

    setIsChangingPassword(true)

    const response = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    })
    const payload = await response.json().catch(() => null)

    setIsChangingPassword(false)

    if (!response.ok) {
      setPasswordError(payload?.error ?? t.passwordChangeFailed)
      return
    }

    setProfileUser(payload.user)
    passwordFormRef.current?.reset()
    setPasswordSuccess(t.passwordChanged)
    router.refresh()
  }

  async function handleDeleteAccount() {
    setDeleteError(null)

    if (deleteConfirmation !== "DELETE") {
      setDeleteError(t.deleteAccountRequireConfirmation)
      return
    }

    setIsDeleting(true)

    const response = await fetch("/api/profile", {
      method: "DELETE",
    })
    const payload = await response.json().catch(() => null)

    setIsDeleting(false)

    if (!response.ok) {
      setDeleteError(payload?.error ?? t.deleteAccountFailed)
      return
    }

    router.replace("/login")
    router.refresh()
  }

  return (
    <SidebarProvider>
      <AppSidebar user={profileUser} />
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
                  label: t.profile,
                },
              ]}
            />
          </div>
          <div className="ml-auto px-4">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <section className="flex flex-col gap-6 rounded-lg border bg-background p-5 md:flex-row md:items-center">
            <div className="relative w-fit">
              <Avatar className="size-28 text-3xl">
                <AvatarImage
                  src={profileUser.avatarUrl ?? ""}
                  alt={profileUser.name}
                />
                <AvatarFallback className="text-3xl">
                  {getUserInitials(profileUser.name)}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                size="icon"
                className="absolute right-0 bottom-0 rounded-full shadow-sm"
                aria-label={t.changeAvatar}
                disabled={isUploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
              >
                <CameraIcon />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-2xl font-semibold">{t.profile}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.profileDescription}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {t.avatarHelp}
              </p>
              <StatusMessage error={avatarError} success={avatarSuccess} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <section className="rounded-lg border bg-background p-5">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">{t.accountInfo}</h2>
                <p className="text-sm text-muted-foreground">
                  {t.accountInfoDescription}
                </p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <AccountInfoItem label={t.name} value={profileUser.name} />
                <AccountInfoItem label={t.email} value={profileUser.email} />
              </dl>
            </section>

            <section className="rounded-lg border bg-background p-5">
              <div className="mb-5 flex items-center gap-2">
                <LockKeyholeIcon className="size-4 text-muted-foreground" />
                <div>
                  <h2 className="text-lg font-semibold">{t.changePassword}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t.passwordHelp}
                  </p>
                </div>
              </div>
              <form ref={passwordFormRef} onSubmit={handlePasswordSubmit}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="current-password">
                      {t.currentPassword}
                    </FieldLabel>
                    <Input
                      id="current-password"
                      name="currentPassword"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="new-password">
                      {t.newPassword}
                    </FieldLabel>
                    <Input
                      id="new-password"
                      name="newPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      {t.confirmPassword}
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </Field>
                  <StatusMessage error={passwordError} success={passwordSuccess} />
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? t.savePasswordPending : t.savePassword}
                  </Button>
                </FieldGroup>
              </form>
            </section>
          </div>

          <section className="rounded-lg border border-destructive/30 bg-background p-5">
            <div className="mb-5 flex items-center gap-2">
              <Trash2Icon className="size-4 text-destructive" />
              <div>
                <h2 className="text-lg font-semibold">{t.deleteAccount}</h2>
                <p className="text-sm text-muted-foreground">
                  {t.accountDeletedLogout}
                </p>
              </div>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="delete-confirmation">
                  {t.deleteAccountConfirmation}
                </FieldLabel>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                />
                <FieldDescription>
                  {t.deleteAccountIrreversible}
                </FieldDescription>
              </Field>
              <StatusMessage error={deleteError} />
              <Button
                type="button"
                variant="destructive"
                className="w-fit"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
              >
                <Trash2Icon />
                {isDeleting ? t.deleteAccountPending : t.deleteAccountButton}
              </Button>
            </FieldGroup>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function AccountInfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  )
}

function StatusMessage({
  error,
  success,
}: {
  error?: string | null
  success?: string | null
}) {
  if (error) {
    return (
      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    )
  }

  if (success) {
    return (
      <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
        {success}
      </p>
    )
  }

  return null
}

function getUserInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  )
}
