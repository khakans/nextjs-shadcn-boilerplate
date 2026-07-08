"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CameraIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  CircleXIcon,
  HistoryIcon,
  LockKeyholeIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
  PencilIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getUserSessions,
  logoutOtherUserSessions,
  revokeUserSession,
  type UserSessionItem,
} from "@/features/auth/api/auth-client";
import {
  getAuditTrails,
  type AuditTrailItem,
} from "@/features/audit-trail/api/audit-trail-client";
import {
  phoneCountryCodes,
  splitMobileNumber,
} from "@/features/profile/lib/phone-country-codes";
import { getApiErrorMessage } from "@/lib/api/http-client";
import type { AuthUser } from "@/lib/auth";
import type { getMessages } from "@/lib/i18n";
import type { PaginationMeta } from "@/lib/pagination";

type Messages = ReturnType<typeof getMessages>;

type AvatarProfileSectionProps = {
  avatarError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploadingAvatar: boolean;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  t: Messages;
  user: AuthUser;
};

export function AvatarProfileSection({
  avatarError,
  fileInputRef,
  isUploadingAvatar,
  onAvatarChange,
  t,
  user,
}: AvatarProfileSectionProps) {
  return (
    <section className="flex flex-col gap-6 rounded-lg border bg-background p-5 md:flex-row md:items-center">
      <div className="relative w-fit">
        <Avatar className="size-28 text-3xl">
          <AvatarImage src={user.avatarUrl ?? ""} alt={user.name} />
          <AvatarFallback className="text-3xl">
            {getUserInitials(user.name)}
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
          onChange={onAvatarChange}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold">{t.profile}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.profileDescription}
        </p>
        <p className="mt-3 text-xs text-muted-foreground">{t.avatarHelp}</p>
        <StatusMessage error={avatarError} />
      </div>
    </section>
  );
}

export function AccountInfoSection({
  onEditUsername,
  t,
  user,
}: {
  onEditUsername: () => void;
  t: Messages;
  user: AuthUser;
}) {
  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{t.accountInfo}</h2>
        <p className="text-sm text-muted-foreground">
          {t.accountInfoDescription}
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <AccountInfoItem label={t.name} value={user.name} />
        <AccountInfoItem label={t.email} value={user.email} />
        <AccountInfoItem
          label={t.username}
          value={user.username ?? t.usernameNotSet}
          action={
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.changeUsername}
                    className="shrink-0"
                    onClick={onEditUsername}
                  />
                }
              >
                <PencilIcon />
              </TooltipTrigger>
              <TooltipContent>{t.changeUsername}</TooltipContent>
            </Tooltip>
          }
        />
      </dl>
    </section>
  );
}

type UsernameDialogProps = {
  confirmOpen: boolean;
  draft: string;
  error: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onConfirmOpenChange: (open: boolean) => void;
  onDraftChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  open: boolean;
  pendingUsername: string | null;
  t: Messages;
};

export function UsernameDialog({
  confirmOpen,
  draft,
  error,
  isPending,
  onConfirm,
  onConfirmOpenChange,
  onDraftChange,
  onOpenChange,
  onSubmit,
  open,
  pendingUsername,
  t,
}: UsernameDialogProps) {
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.changeUsername}</DialogTitle>
            <DialogDescription>{t.usernameHelp}</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">{t.username}</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={draft}
                  autoComplete="username"
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_]{3,30}"
                  placeholder={t.usernamePlaceholder}
                  onChange={(event) => onDraftChange(event.target.value)}
                />
                <FieldDescription>{t.usernameDescription}</FieldDescription>
              </Field>
              <StatusMessage error={error} />
              <DialogFooter>
                <DialogClose
                  render={
                    <Button type="button" variant="outline" disabled={isPending} />
                  }
                >
                  {t.cancel}
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                  {t.continue}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t.confirmUsernameChange}</DialogTitle>
            <DialogDescription>
              {pendingUsername
                ? t.confirmUsernameChangeDescription
                : t.confirmUsernameRemovalDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
            {pendingUsername ?? t.usernameNotSet}
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending} />
              }
            >
              {t.cancel}
            </DialogClose>
            <Button type="button" disabled={isPending} onClick={onConfirm}>
              {isPending ? t.saveUsernamePending : t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ProfileDetailsSectionProps = {
  confirmOpen: boolean;
  error: string | null;
  isPending: boolean;
  onConfirm: () => void;
  onConfirmOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Messages;
  user: AuthUser;
};

export function ProfileDetailsSection({
  confirmOpen,
  error,
  isPending,
  onConfirm,
  onConfirmOpenChange,
  onSubmit,
  t,
  user,
}: ProfileDetailsSectionProps) {
  const mobileNumber = splitMobileNumber(user.mobileNumber);
  const [gender, setGender] = React.useState(user.gender ?? "");
  const [countryCode, setCountryCode] = React.useState(
    mobileNumber.countryCode,
  );

  const genderOptions = [
    {
      label: t.genderUnspecified,
      value: "",
    },
    {
      label: t.genderMale,
      value: "male",
    },
    {
      label: t.genderFemale,
      value: "female",
    },
    {
      label: t.genderOther,
      value: "other",
    },
    {
      label: t.genderPreferNotToSay,
      value: "prefer_not_to_say",
    },
  ];
  const selectedGenderLabel =
    genderOptions.find((option) => option.value === gender)?.label ??
    t.genderUnspecified;
  const selectedCountryCodeLabel =
    phoneCountryCodes.find((option) => option.code === countryCode)?.code ??
    countryCode;

  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{t.profileDetails}</h2>
        <p className="text-sm text-muted-foreground">
          {t.profileDetailsDescription}
        </p>
      </div>
      <form
        key={[
          user.birthDate,
          user.birthPlace,
          user.gender,
          user.mobileNumber,
        ].join(":")}
        onSubmit={onSubmit}
      >
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="birth-date">{t.birthDate}</FieldLabel>
              <Input
                id="birth-date"
                name="birthDate"
                type="date"
                defaultValue={user.birthDate ?? ""}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="birth-place">{t.birthPlace}</FieldLabel>
              <Input
                id="birth-place"
                name="birthPlace"
                type="text"
                defaultValue={user.birthPlace ?? ""}
                placeholder={t.birthPlacePlaceholder}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="gender">{t.gender}</FieldLabel>
              <input type="hidden" name="gender" value={gender} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                    />
                  }
                >
                  {selectedGenderLabel}
                  <ChevronDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuRadioGroup
                    value={gender}
                    onValueChange={setGender}
                  >
                    {genderOptions.map((option) => (
                      <DropdownMenuRadioItem
                        key={option.value || "unspecified"}
                        value={option.value}
                      >
                        {option.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>
            <Field>
              <FieldLabel htmlFor="mobile-number">{t.mobileNumber}</FieldLabel>
              <div className="grid gap-2 grid-cols-[96px_minmax(0,1fr)]">
                <input type="hidden" name="countryCode" value={countryCode} />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-label={t.phoneCountryCode}
                        className="w-full justify-between"
                      />
                    }
                  >
                    {selectedCountryCodeLabel}
                    <ChevronDownIcon data-icon="inline-end" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64">
                    <DropdownMenuRadioGroup
                      value={countryCode}
                      onValueChange={setCountryCode}
                    >
                      {phoneCountryCodes.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.code}
                          value={option.code}
                        >
                          <span className="min-w-10 font-medium">
                            {option.code}
                          </span>
                          <span className="truncate text-muted-foreground">
                            {option.country}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  id="mobile-number"
                  name="mobileNumber"
                  type="tel"
                  inputMode="numeric"
                  defaultValue={mobileNumber.localNumber}
                  placeholder={t.mobileNumberPlaceholder}
                />
              </div>
              <FieldDescription>{t.mobileNumberDescription}</FieldDescription>
            </Field>
          </div>
          <StatusMessage error={error} />
          <Button type="submit" className="w-fit" disabled={isPending}>
            {isPending ? t.saveProfileDetailsPending : t.saveProfileDetails}
          </Button>
        </FieldGroup>
      </form>
      <Dialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t.confirmProfileDetailsChange}</DialogTitle>
            <DialogDescription>
              {t.confirmProfileDetailsChangeDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending} />
              }
            >
              {t.cancel}
            </DialogClose>
            <Button type="button" disabled={isPending} onClick={onConfirm}>
              {isPending ? t.saveProfileDetailsPending : t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type PasswordSectionProps = {
  confirmOpen: boolean;
  error: string | null;
  formRef: React.RefObject<HTMLFormElement | null>;
  isPending: boolean;
  onConfirm: () => void;
  onConfirmOpenChange: (open: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  t: Messages;
};

export function PasswordSection({
  confirmOpen,
  error,
  formRef,
  isPending,
  onConfirm,
  onConfirmOpenChange,
  onSubmit,
  t,
}: PasswordSectionProps) {
  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5 flex items-center gap-2">
        <LockKeyholeIcon className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">{t.changePassword}</h2>
          <p className="text-sm text-muted-foreground">{t.passwordHelp}</p>
        </div>
      </div>
      <form ref={formRef} onSubmit={onSubmit}>
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
            <FieldLabel htmlFor="new-password">{t.newPassword}</FieldLabel>
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
          <StatusMessage error={error} />
          <Button type="submit" disabled={isPending}>
            {isPending ? t.savePasswordPending : t.savePassword}
          </Button>
        </FieldGroup>
      </form>
      <Dialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t.confirmPasswordChange}</DialogTitle>
            <DialogDescription>
              {t.confirmPasswordChangeDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending} />
              }
            >
              {t.cancel}
            </DialogClose>
            <Button type="button" disabled={isPending} onClick={onConfirm}>
              {isPending ? t.savePasswordPending : t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function ActiveSessionsSection({ t }: { t: Messages }) {
  const [sessions, setSessions] = React.useState<UserSessionItem[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [pendingSession, setPendingSession] =
    React.useState<UserSessionItem | null>(null);
  const [isRevokeConfirmOpen, setIsRevokeConfirmOpen] = React.useState(false);
  const [isLogoutOthersConfirmOpen, setIsLogoutOthersConfirmOpen] =
    React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<
    "session" | "others" | null
  >(null);

  const otherSessions = sessions.filter((session) => !session.isCurrent);
  const hasMore = pagination ? pagination.page < pagination.totalPages : false;
  const hasOtherSessions =
    otherSessions.length > 0 ||
    (pagination ? pagination.totalCount > 1 : sessions.length > 1);

  React.useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      setIsLoading(true);

      try {
        const payload = await getUserSessions();

        if (isMounted) {
          setSessions(payload.sessions);
          setPagination(payload.pagination);
        }
      } catch (loadError) {
        if (isMounted) {
          toast.error(getApiErrorMessage(loadError, t.sessionsLoadFailed));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [t.sessionsLoadFailed]);

  async function loadMoreSessions() {
    if (!hasMore || !pagination) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const payload = await getUserSessions(
        pagination.page + 1,
        pagination.pageSize,
      );
      setSessions((currentSessions) => [
        ...currentSessions,
        ...payload.sessions,
      ]);
      setPagination(payload.pagination);
    } catch (loadError) {
      toast.error(getApiErrorMessage(loadError, t.sessionsLoadFailed));
    } finally {
      setIsLoadingMore(false);
    }
  }

  function openRevokeSessionDialog(session: UserSessionItem) {
    setPendingSession(session);
    setIsRevokeConfirmOpen(true);
  }

  async function confirmRevokeSession() {
    if (!pendingSession) {
      return;
    }

    setPendingAction("session");

    try {
      await revokeUserSession(pendingSession.sessionId);
      setSessions((currentSessions) =>
        currentSessions.filter(
          (session) => session.sessionId !== pendingSession.sessionId,
        ),
      );
      toast.success(t.sessionLoggedOut);
      setPendingSession(null);
      setIsRevokeConfirmOpen(false);
    } catch (revokeError) {
      toast.error(getApiErrorMessage(revokeError, t.sessionLogoutFailed));
      setIsRevokeConfirmOpen(false);
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmLogoutOthers() {
    setPendingAction("others");

    try {
      await logoutOtherUserSessions();
      setSessions((currentSessions) =>
        currentSessions.filter((session) => session.isCurrent),
      );
      toast.success(t.otherSessionsLoggedOut);
      setIsLogoutOthersConfirmOpen(false);
    } catch (logoutError) {
      toast.error(getApiErrorMessage(logoutError, t.otherSessionsLogoutFailed));
      setIsLogoutOthersConfirmOpen(false);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <MonitorSmartphoneIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{t.activeSessions}</h2>
            <p className="text-sm text-muted-foreground">
              {t.activeSessionsDescription}
            </p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={t.logoutOtherDevices}
                disabled={
                  isLoading ||
                  !hasOtherSessions ||
                  pendingAction !== null
                }
                onClick={() => {
                  setIsLogoutOthersConfirmOpen(true);
                }}
              />
            }
          >
            <LogOutIcon />
          </TooltipTrigger>
          <TooltipContent>{t.logoutOtherDevices}</TooltipContent>
        </Tooltip>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <>
            <SessionSkeleton />
            <SessionSkeleton />
          </>
        ) : sessions.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {t.noActiveSessions}
          </div>
        ) : (
          sessions.map((session) => (
            <SessionListItem
              key={session.sessionId}
              isPending={pendingAction !== null}
              onLogout={() => openRevokeSessionDialog(session)}
              session={session}
              t={t}
            />
          ))
        )}
      </div>

      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          disabled={isLoadingMore}
          onClick={loadMoreSessions}
        >
          {isLoadingMore ? t.loading : t.loadMore}
        </Button>
      ) : null}

      <Dialog
        open={isRevokeConfirmOpen}
        onOpenChange={setIsRevokeConfirmOpen}
      >
        <DialogContent showCloseButton={pendingAction !== "session"}>
          <DialogHeader>
            <DialogTitle>{t.confirmSessionLogout}</DialogTitle>
            <DialogDescription>
              {t.confirmSessionLogoutDescription}
            </DialogDescription>
          </DialogHeader>
          {pendingSession ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{formatSessionTitle(pendingSession, t)}</p>
              <p className="mt-1 text-muted-foreground">
                {formatSessionMeta(pendingSession, t)}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingAction === "session"}
                />
              }
            >
              {t.cancel}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pendingAction === "session"}
              onClick={confirmRevokeSession}
            >
              {pendingAction === "session"
                ? t.sessionLogoutPending
                : t.logoutDevice}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isLogoutOthersConfirmOpen}
        onOpenChange={setIsLogoutOthersConfirmOpen}
      >
        <DialogContent showCloseButton={pendingAction !== "others"}>
          <DialogHeader>
            <DialogTitle>{t.confirmLogoutOtherDevices}</DialogTitle>
            <DialogDescription>
              {t.confirmLogoutOtherDevicesDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  disabled={pendingAction === "others"}
                />
              }
            >
              {t.cancel}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pendingAction === "others"}
              onClick={confirmLogoutOthers}
            >
              {pendingAction === "others"
                ? t.sessionLogoutPending
                : t.logoutOtherDevices}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function AuditTrailSection({ t }: { t: Messages }) {
  const [auditTrails, setAuditTrails] = React.useState<AuditTrailItem[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [selectedTrail, setSelectedTrail] =
    React.useState<AuditTrailItem | null>(null);
  const hasMore = pagination ? pagination.page < pagination.totalPages : false;

  React.useEffect(() => {
    let isMounted = true;

    async function loadAuditTrails() {
      setIsLoading(true);

      try {
        const payload = await getAuditTrails();

        if (isMounted) {
          setAuditTrails(payload.auditTrails);
          setPagination(payload.pagination);
        }
      } catch (loadError) {
        if (isMounted) {
          toast.error(getApiErrorMessage(loadError, t.auditTrailLoadFailed));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAuditTrails();

    return () => {
      isMounted = false;
    };
  }, [t.auditTrailLoadFailed]);

  async function loadMoreAuditTrails() {
    if (!hasMore || !pagination) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const payload = await getAuditTrails(
        pagination.page + 1,
        pagination.pageSize,
      );
      setAuditTrails((currentAuditTrails) => [
        ...currentAuditTrails,
        ...payload.auditTrails,
      ]);
      setPagination(payload.pagination);
    } catch (loadError) {
      toast.error(getApiErrorMessage(loadError, t.auditTrailLoadFailed));
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="rounded-lg border bg-background p-5">
      <div className="mb-5 flex items-start gap-2">
        <HistoryIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t.auditTrail}</h2>
          <p className="text-sm text-muted-foreground">
            {t.auditTrailDescription}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <>
            <AuditTrailSkeleton />
            <AuditTrailSkeleton />
          </>
        ) : auditTrails.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {t.noAuditTrails}
          </div>
        ) : (
          auditTrails.map((auditTrail) => (
            <AuditTrailListItem
              key={auditTrail.id}
              auditTrail={auditTrail}
              onOpen={() => setSelectedTrail(auditTrail)}
              t={t}
            />
          ))
        )}
      </div>

      {hasMore ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full"
          disabled={isLoadingMore}
          onClick={loadMoreAuditTrails}
        >
          {isLoadingMore ? t.loading : t.loadMore}
        </Button>
      ) : null}

      <Dialog
        open={Boolean(selectedTrail)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTrail(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.auditTrailDetails}</DialogTitle>
            <DialogDescription>
              {selectedTrail ? formatAuditAction(selectedTrail.action) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedTrail ? (
            <div className="grid gap-4 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <AuditTrailDetailItem
                  label={t.eventTime}
                  value={formatDateTime(selectedTrail.createdAt)}
                />
                <AuditTrailDetailItem
                  label={t.status}
                  value={selectedTrail.status}
                />
                <AuditTrailDetailItem
                  label={t.entity}
                  value={[selectedTrail.entityType, selectedTrail.entityId]
                    .filter(Boolean)
                    .join(" - ")}
                />
                <AuditTrailDetailItem
                  label={t.sourceIp}
                  value={selectedTrail.ipAddress ?? "-"}
                />
              </dl>
              {selectedTrail.changedFields.length > 0 ? (
                <div>
                  <h3 className="text-xs font-medium uppercase text-muted-foreground">
                    {t.changedFields}
                  </h3>
                  <p className="mt-1 break-words">
                    {selectedTrail.changedFields.join(", ")}
                  </p>
                </div>
              ) : null}
              <AuditTrailJsonBlock label={t.before} value={selectedTrail.before} />
              <AuditTrailJsonBlock label={t.after} value={selectedTrail.after} />
              <AuditTrailJsonBlock
                label={t.metadata}
                value={selectedTrail.metadata}
              />
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              {t.close}
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type DeleteAccountSectionProps = {
  confirmation: string;
  confirmOpen: boolean;
  error: string | null;
  isPending: boolean;
  onConfirmationChange: (value: string) => void;
  onConfirm: () => void;
  onConfirmOpenChange: (open: boolean) => void;
  onDeleteAccount: () => void;
  t: Messages;
};

export function DeleteAccountSection({
  confirmation,
  confirmOpen,
  error,
  isPending,
  onConfirmationChange,
  onConfirm,
  onConfirmOpenChange,
  onDeleteAccount,
  t,
}: DeleteAccountSectionProps) {
  return (
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
        <p className="text-sm text-muted-foreground">
          {t.deleteAccountIrreversible}
        </p>
        <StatusMessage error={error} />
        <Button
          type="button"
          variant="destructive"
          className="w-fit"
          disabled={isPending}
          onClick={onDeleteAccount}
        >
          <Trash2Icon />
          {isPending ? t.deleteAccountPending : t.deleteAccountButton}
        </Button>
      </FieldGroup>
      <Dialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <DialogContent showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>{t.confirmDeleteAccount}</DialogTitle>
            <DialogDescription>
              {t.confirmDeleteAccountDescription}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="delete-confirmation">
              {t.deleteAccountConfirmation}
            </FieldLabel>
            <Input
              id="delete-confirmation"
              value={confirmation}
              autoComplete="off"
              disabled={isPending}
              onChange={(event) => onConfirmationChange(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={isPending} />
              }
            >
              {t.cancel}
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || confirmation !== "DELETE"}
              onClick={onConfirm}
            >
              {isPending ? t.deleteAccountPending : t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AuditTrailListItem({
  auditTrail,
  onOpen,
  t,
}: {
  auditTrail: AuditTrailItem;
  onOpen: () => void;
  t: Messages;
}) {
  const isSuccess = auditTrail.status.toUpperCase() === "SUCCESS";

  return (
    <button
      type="button"
      className="rounded-lg border bg-muted/20 p-3 text-left transition-colors hover:bg-muted/40"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
          {isSuccess ? (
            <CircleCheckIcon className="size-4 text-primary" />
          ) : (
            <CircleXIcon className="size-4 text-destructive" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">
              {formatAuditAction(auditTrail.action)}
            </p>
            <span
              className={
                isSuccess
                  ? "rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  : "rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
              }
            >
              {auditTrail.status}
            </span>
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {[auditTrail.entityType, auditTrail.ipAddress]
              .filter(Boolean)
              .join(" - ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(auditTrail.createdAt)}
          </p>
          {auditTrail.changedFields.length > 0 ? (
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {t.changedFields}: {auditTrail.changedFields.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function AuditTrailDetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{value || "-"}</dd>
    </div>
  );
}

function AuditTrailJsonBlock({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  if (!hasAuditPayload(value)) {
    return null;
  }

  return (
    <div>
      <h3 className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </h3>
      <pre className="mt-1 max-h-56 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function AuditTrailSkeleton() {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function AccountInfoItem({
  action,
  label,
  value,
}: {
  action?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
        </div>
        {action}
      </div>
    </div>
  );
}

function SessionListItem({
  isPending,
  onLogout,
  session,
  t,
}: {
  isPending: boolean;
  onLogout: () => void;
  session: UserSessionItem;
  t: Messages;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
          {session.isCurrent ? (
            <ShieldCheckIcon className="size-4 text-primary" />
          ) : (
            <MonitorSmartphoneIcon className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">
              {formatSessionTitle(session, t)}
            </p>
            {session.isCurrent ? (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {t.thisDevice}
              </span>
            ) : null}
          </div>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {formatSessionMeta(session, t)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.lastActive}: {formatDateTime(session.lastActiveAt)}
          </p>
        </div>
        {!session.isCurrent ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t.logoutDevice}
                  disabled={isPending}
                  onClick={onLogout}
                />
              }
            >
              <LogOutIcon />
            </TooltipTrigger>
            <TooltipContent>{t.logoutDevice}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function formatSessionTitle(session: UserSessionItem, t: Messages) {
  const browser = session.browser ?? t.unknownBrowser;
  const operatingSystem = session.operatingSystem ?? t.unknownOs;

  return `${browser} ${t.onDevice} ${operatingSystem}`;
}

function formatSessionMeta(session: UserSessionItem, t: Messages) {
  const parts = [
    session.deviceName,
    session.ipAddress,
    `${t.loginAt}: ${formatDateTime(session.loginAt)}`,
  ].filter(Boolean);

  return parts.join(" - ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatAuditAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function hasAuditPayload(value: unknown) {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  return true;
}

function StatusMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) {
    return (
      <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
        {success}
      </p>
    );
  }

  return null;
}

function getUserInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
}
