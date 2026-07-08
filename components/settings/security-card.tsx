"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  HistoryIcon,
  FileSearchIcon,
  KeyRoundIcon,
  LogOutIcon,
  MonitorSmartphoneIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAuditTrail,
  getAuditTrails,
  type AuditTrailDetailItem,
  type AuditTrailItem,
} from "@/features/audit-trail/api/audit-trail-client";
import {
  getUserSessions,
  revokeUserSession,
  type UserSessionItem,
} from "@/features/auth/api/auth-client";
import { changePassword } from "@/features/profile/api/profile-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import type { PaginationMeta } from "@/lib/pagination";
import { getMessages } from "@/lib/i18n";
import { useLanguagePreference } from "@/lib/theme";

import { formatAuditAction, formatDateTime } from "./settings-utils";

function getPasswordSchema(t: ReturnType<typeof getMessages>) {
  return z
    .object({
      currentPassword: z.string().min(1, t.currentPasswordRequired),
      newPassword: z.string().min(8, t.newPasswordMin),
      confirmPassword: z.string().min(8, t.confirmNewPasswordRequired),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      message: t.newPasswordMismatch,
      path: ["confirmPassword"],
    });
}

type PasswordFormValues = z.infer<ReturnType<typeof getPasswordSchema>>;

export function SecurityCard() {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const passwordSchema = React.useMemo(() => getPasswordSchema(t), [t]);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [sessions, setSessions] = React.useState<UserSessionItem[]>([]);
  const [sessionsPagination, setSessionsPagination] =
    React.useState<PaginationMeta | null>(null);
  const [auditTrails, setAuditTrails] = React.useState<AuditTrailItem[]>([]);
  const [auditTrailsPagination, setAuditTrailsPagination] =
    React.useState<PaginationMeta | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = React.useState(true);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] =
    React.useState(false);
  const [isLoadingMoreAuditTrails, setIsLoadingMoreAuditTrails] =
    React.useState(false);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [auditTrailsError, setAuditTrailsError] = React.useState<string | null>(
    null,
  );
  const [pendingSessionId, setPendingSessionId] = React.useState<string | null>(
    null,
  );
  const [sessionToRevoke, setSessionToRevoke] =
    React.useState<UserSessionItem | null>(null);
  const [selectedAuditTrail, setSelectedAuditTrail] =
    React.useState<AuditTrailItem | null>(null);
  const [selectedAuditTrailDetail, setSelectedAuditTrailDetail] =
    React.useState<AuditTrailDetailItem | null>(null);
  const [isLoadingAuditTrailDetail, setIsLoadingAuditTrailDetail] =
    React.useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    let isMounted = true;

    async function loadSecurityData() {
      setIsLoadingSecurity(true);
      setSessionsError(null);
      setAuditTrailsError(null);

      const [sessionResult, auditResult] = await Promise.allSettled([
        getUserSessions(1, 5),
        getAuditTrails(1, 5),
      ]);

      if (isMounted) {
        if (sessionResult.status === "fulfilled") {
          setSessions(sessionResult.value.sessions);
          setSessionsPagination(sessionResult.value.pagination);
        } else {
          setSessionsError(
            getApiErrorMessage(
              sessionResult.reason,
              t.sessionsLoadFailed,
            ),
          );
        }

        if (auditResult.status === "fulfilled") {
          setAuditTrails(auditResult.value.auditTrails);
          setAuditTrailsPagination(auditResult.value.pagination);
        } else {
          setAuditTrailsError(
            getApiErrorMessage(
              auditResult.reason,
              t.auditTrailLoadFailed,
            ),
          );
        }

        setIsLoadingSecurity(false);
      }
    }

    loadSecurityData();

    return () => {
      isMounted = false;
    };
  }, [t.auditTrailLoadFailed, t.sessionsLoadFailed]);

  async function submitPassword(values: PasswordFormValues) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.reset();
      setIsPasswordDialogOpen(false);
      toast.success(t.passwordChangedShort);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.passwordChangeFailed));
    }
  }

  async function logoutSession(session: UserSessionItem) {
    setPendingSessionId(session.sessionId);

    try {
      await revokeUserSession(session.sessionId);
      setSessions((current) =>
        current.filter((item) => item.sessionId !== session.sessionId),
      );
      setSessionsPagination((current) =>
        current
          ? {
              ...current,
              totalCount: Math.max(0, current.totalCount - 1),
            }
          : current,
      );
      toast.success(t.sessionLoggedOutShort);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.sessionLogoutFailed));
    } finally {
      setPendingSessionId(null);
    }
  }

  function openRevokeSessionDialog(session: UserSessionItem) {
    setSessionToRevoke(session);
  }

  function handleRevokeDialogOpenChange(open: boolean) {
    if (!open && !pendingSessionId) {
      setSessionToRevoke(null);
    }
  }

  async function confirmRevokeSession() {
    if (!sessionToRevoke) {
      return;
    }

    await logoutSession(sessionToRevoke);
    setSessionToRevoke(null);
  }

  async function loadMoreSessions() {
    if (
      isLoadingMoreSessions ||
      !sessionsPagination ||
      sessionsPagination.page >= sessionsPagination.totalPages
    ) {
      return;
    }

    setIsLoadingMoreSessions(true);

    try {
      const payload = await getUserSessions(
        sessionsPagination.page + 1,
        sessionsPagination.pageSize,
      );
      setSessions((current) => [...current, ...payload.sessions]);
      setSessionsPagination(payload.pagination);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.failedToLoadMoreSessions));
    } finally {
      setIsLoadingMoreSessions(false);
    }
  }

  async function loadMoreAuditTrails() {
    if (
      isLoadingMoreAuditTrails ||
      !auditTrailsPagination ||
      auditTrailsPagination.page >= auditTrailsPagination.totalPages
    ) {
      return;
    }

    setIsLoadingMoreAuditTrails(true);

    try {
      const payload = await getAuditTrails(
        auditTrailsPagination.page + 1,
        auditTrailsPagination.pageSize,
      );
      setAuditTrails((current) => [...current, ...payload.auditTrails]);
      setAuditTrailsPagination(payload.pagination);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t.failedToLoadMoreAuditEvents));
    } finally {
      setIsLoadingMoreAuditTrails(false);
    }
  }

  async function openAuditTrailDetail(auditTrail: AuditTrailItem) {
    setSelectedAuditTrail(auditTrail);
    setSelectedAuditTrailDetail(null);
    setIsLoadingAuditTrailDetail(true);

    try {
      const payload = await getAuditTrail(auditTrail.id);
      setSelectedAuditTrailDetail(payload.auditTrail);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, t.failedToLoadAuditDetail),
      );
    } finally {
      setIsLoadingAuditTrailDetail(false);
    }
  }

  return (
    <Card id="security">
      <CardHeader>
        <CardTitle>{t.profileNavAccountSecurity}</CardTitle>
        <CardDescription>
          {t.securityAccountDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <KeyRoundIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium">{t.passwordTitle}</h3>
              <p className="text-sm text-muted-foreground">
                {t.passwordDescription}
              </p>
            </div>
          </div>
          <Dialog
            open={isPasswordDialogOpen}
            onOpenChange={setIsPasswordDialogOpen}
          >
            <DialogTrigger render={<Button type="button" variant="outline" />}>
              {t.changePassword}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.changePassword}</DialogTitle>
                <DialogDescription>
                  {t.passwordHelp}
                </DialogDescription>
              </DialogHeader>
              <form
                id="change-password-form"
                onSubmit={passwordForm.handleSubmit(submitPassword)}
              >
                <FieldGroup>
                  <Field
                    data-invalid={Boolean(
                      passwordForm.formState.errors.currentPassword,
                    )}
                  >
                    <FieldLabel htmlFor="current-password">
                      {t.currentPassword}
                    </FieldLabel>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      aria-invalid={Boolean(
                        passwordForm.formState.errors.currentPassword,
                      )}
                      {...passwordForm.register("currentPassword")}
                    />
                    <FieldError>
                      {passwordForm.formState.errors.currentPassword?.message}
                    </FieldError>
                  </Field>
                  <Field
                    data-invalid={Boolean(
                      passwordForm.formState.errors.newPassword,
                    )}
                  >
                    <FieldLabel htmlFor="new-password">{t.newPassword}</FieldLabel>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={Boolean(
                        passwordForm.formState.errors.newPassword,
                      )}
                      {...passwordForm.register("newPassword")}
                    />
                    <FieldError>
                      {passwordForm.formState.errors.newPassword?.message}
                    </FieldError>
                  </Field>
                  <Field
                    data-invalid={Boolean(
                      passwordForm.formState.errors.confirmPassword,
                    )}
                  >
                    <FieldLabel htmlFor="confirm-password">
                      {t.confirmPassword}
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={Boolean(
                        passwordForm.formState.errors.confirmPassword,
                      )}
                      {...passwordForm.register("confirmPassword")}
                    />
                    <FieldError>
                      {passwordForm.formState.errors.confirmPassword?.message}
                    </FieldError>
                  </Field>
                </FieldGroup>
              </form>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={passwordForm.formState.isSubmitting}
                    />
                  }
                >
                  {t.cancel}
                </DialogClose>
                <Button
                  type="submit"
                  form="change-password-form"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  {passwordForm.formState.isSubmitting
                    ? t.savePasswordPending
                    : t.savePassword}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        <section aria-labelledby="active-sessions-title" className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="active-sessions-title" className="text-sm font-medium">
                {t.activeSessions}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.activeSessionsTableDescription}
              </p>
            </div>
            <Badge variant="secondary">
              {sessionsPagination?.totalCount ?? sessions.length} {t.active}
            </Badge>
          </div>

          {isLoadingSecurity ? (
            <SecurityListSkeleton />
          ) : sessionsError ? (
            <ErrorState message={sessionsError} />
          ) : sessions.length === 0 ? (
            <EmptyState message="No active sessions found." />
          ) : (
            <SessionsTable
              hasMore={Boolean(
                sessionsPagination &&
                  sessionsPagination.page < sessionsPagination.totalPages,
              )}
              isLoadingMore={isLoadingMoreSessions}
              onLoadMore={loadMoreSessions}
              onLogoutSession={openRevokeSessionDialog}
              pendingSessionId={pendingSessionId}
              sessions={sessions}
              t={t}
            />
          )}
        </section>

        <Separator />

        <section aria-labelledby="audit-log-title" className="grid gap-3">
          <div>
            <h3 id="audit-log-title" className="text-sm font-medium">
              {t.auditLog}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t.auditLogDescription}
            </p>
          </div>

          {isLoadingSecurity ? (
            <SecurityListSkeleton />
          ) : auditTrailsError ? (
            <ErrorState message={auditTrailsError} />
          ) : auditTrails.length === 0 ? (
            <EmptyState message={t.noAuditEvents} />
          ) : (
            <AuditTrailTable
              auditTrails={auditTrails}
              hasMore={Boolean(
                auditTrailsPagination &&
                  auditTrailsPagination.page < auditTrailsPagination.totalPages,
              )}
              isLoadingMore={isLoadingMoreAuditTrails}
              onLoadMore={loadMoreAuditTrails}
              onOpenDetail={openAuditTrailDetail}
              t={t}
            />
          )}
        </section>

        <Dialog
          open={Boolean(sessionToRevoke)}
          onOpenChange={handleRevokeDialogOpenChange}
        >
          <DialogContent showCloseButton={!pendingSessionId}>
            <DialogHeader>
              <DialogTitle>{t.logOutSessionQuestion}</DialogTitle>
              <DialogDescription>
                {t.logOutSessionDescription}
              </DialogDescription>
            </DialogHeader>
            {sessionToRevoke ? (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">
                  {formatSessionDevice(sessionToRevoke, t)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {[sessionToRevoke.deviceName, sessionToRevoke.ipAddress]
                    .filter(Boolean)
                    .join(" - ") || t.unknownLocation}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {t.lastActive} {formatDateTime(sessionToRevoke.lastActiveAt)}
                </p>
              </div>
            ) : null}
            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={Boolean(pendingSessionId)}
                  />
                }
              >
                {t.cancel}
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                disabled={Boolean(pendingSessionId)}
                onClick={confirmRevokeSession}
              >
                {pendingSessionId ? t.sessionLogoutPending : t.logOutSession}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(selectedAuditTrail)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAuditTrail(null);
              setSelectedAuditTrailDetail(null);
            }
          }}
        >
          <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.auditLogDetail}</DialogTitle>
              <DialogDescription>
                {selectedAuditTrail
                  ? formatAuditAction(selectedAuditTrail.action)
                  : ""}
              </DialogDescription>
            </DialogHeader>
            {isLoadingAuditTrailDetail ? (
              <div className="grid gap-3">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            ) : selectedAuditTrail ? (
              <div className="grid gap-4 text-sm">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <AuditDetailItem
                    label={t.status}
                    value={getAuditDialogData(
                      selectedAuditTrail,
                      selectedAuditTrailDetail,
                    ).status}
                  />
                  <AuditDetailItem
                    label={t.eventTime}
                    value={formatDateTime(
                      getAuditDialogData(
                        selectedAuditTrail,
                        selectedAuditTrailDetail,
                      ).createdAt,
                    )}
                  />
                  <AuditDetailItem
                    label={t.entity}
                    value={
                      [
                        getAuditDialogData(
                          selectedAuditTrail,
                          selectedAuditTrailDetail,
                        ).entityType,
                        getAuditDialogData(
                          selectedAuditTrail,
                          selectedAuditTrailDetail,
                        ).entityId,
                      ]
                        .filter(Boolean)
                        .join(" - ") || "-"
                    }
                  />
                  <AuditDetailItem
                    label={t.sourceIp}
                    value={
                      selectedAuditTrailDetail?.request.ipAddress ??
                      selectedAuditTrail.ipAddress ??
                      "-"
                    }
                  />
                  <AuditDetailItem
                    label={t.actorUser}
                    value={formatAuditUserDetail(
                      selectedAuditTrailDetail?.actorUser,
                      selectedAuditTrail.actorUserId,
                    )}
                  />
                  <AuditDetailItem
                    label={t.targetUser}
                    value={formatAuditUserDetail(
                      selectedAuditTrailDetail?.targetUser,
                      selectedAuditTrail.targetUserId,
                    )}
                  />
                  <AuditDetailItem
                    label={t.session}
                    value={formatAuditSessionDetail(
                      selectedAuditTrailDetail?.session,
                      selectedAuditTrail.userSessionId,
                      t,
                    )}
                  />
                  <AuditDetailItem
                    label={t.request}
                    value={formatAuditRequestDetail(
                      selectedAuditTrailDetail?.request,
                      selectedAuditTrail.requestId,
                    )}
                  />
                </dl>

                {getAuditDialogData(
                  selectedAuditTrail,
                  selectedAuditTrailDetail,
                ).changedFields.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-medium uppercase text-muted-foreground">
                      {t.changedFields}
                    </h4>
                    <p className="mt-1 break-words">
                      {getAuditDialogData(
                        selectedAuditTrail,
                        selectedAuditTrailDetail,
                      ).changedFields.join(", ")}
                    </p>
                  </div>
                ) : null}

                <AuditJsonBlock
                  label={t.before}
                  value={
                    getAuditDialogData(
                      selectedAuditTrail,
                      selectedAuditTrailDetail,
                    ).before
                  }
                />
                <AuditJsonBlock
                  label={t.after}
                  value={
                    getAuditDialogData(
                      selectedAuditTrail,
                      selectedAuditTrailDetail,
                    ).after
                  }
                />
                <AuditJsonBlock
                  label={t.metadata}
                  value={
                    getAuditDialogData(
                      selectedAuditTrail,
                      selectedAuditTrailDetail,
                    ).metadata
                  }
                />
                <AuditJsonBlock
                  label={t.userAgent}
                  value={
                    selectedAuditTrailDetail?.request.userAgent ??
                    selectedAuditTrail.userAgent
                  }
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
      </CardContent>
    </Card>
  );
}

function SessionsTable({
  hasMore,
  isLoadingMore,
  onLoadMore,
  onLogoutSession,
  pendingSessionId,
  sessions,
  t,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onLogoutSession: (session: UserSessionItem) => void;
  pendingSessionId: string | null;
  sessions: UserSessionItem[];
  t: ReturnType<typeof getMessages>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className="scrollbar-minimal max-h-[200px] overflow-auto"
        onScroll={(event) => {
          if (hasMore && isNearScrollBottom(event.currentTarget)) {
            onLoadMore();
          }
        }}
      >
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">{t.device}</th>
              <th className="px-3 py-2 text-left font-medium">{t.location}</th>
              <th className="px-3 py-2 text-left font-medium">{t.loginTime}</th>
              <th className="px-3 py-2 text-left font-medium">{t.lastActive}</th>
              <th className="px-3 py-2 text-right font-medium">{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.sessionId} className="border-b last:border-b-0">
                <td className="px-3 py-3 align-top">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                      {session.isCurrent ? (
                        <ShieldCheckIcon className="size-4 text-primary" />
                      ) : (
                        <MonitorSmartphoneIcon className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {formatSessionDevice(session, t)}
                        </p>
                        {session.isCurrent ? <Badge>{t.thisDevice}</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {session.deviceName ?? t.unknownDevice}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {session.ipAddress ?? "-"}
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {formatDateTime(session.loginAt)}
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {formatDateTime(session.lastActiveAt)}
                </td>
                <td className="px-3 py-3 text-right align-top">
                  {!session.isCurrent ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.logOutThisSession}
                      disabled={pendingSessionId === session.sessionId}
                      onClick={() => onLogoutSession(session)}
                    >
                      <LogOutIcon />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
            {isLoadingMore ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-3 text-center text-xs text-muted-foreground"
                >
                  {t.loadingMoreSessions}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTrailTable({
  auditTrails,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onOpenDetail,
  t,
}: {
  auditTrails: AuditTrailItem[];
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onOpenDetail: (auditTrail: AuditTrailItem) => void;
  t: ReturnType<typeof getMessages>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div
        className="scrollbar-minimal max-h-[200px] overflow-auto"
        onScroll={(event) => {
          if (hasMore && isNearScrollBottom(event.currentTarget)) {
            onLoadMore();
          }
        }}
      >
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">{t.event}</th>
              <th className="px-3 py-2 text-left font-medium">{t.entity}</th>
              <th className="px-3 py-2 text-left font-medium">{t.sourceIp}</th>
              <th className="px-3 py-2 text-left font-medium">{t.status}</th>
              <th className="px-3 py-2 text-left font-medium">{t.eventTime}</th>
              <th className="px-3 py-2 text-right font-medium">{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {auditTrails.map((auditTrail) => {
              return (
                <tr key={auditTrail.id} className="border-b last:border-b-0">
                  <td className="px-3 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                        <HistoryIcon className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatAuditAction(auditTrail.action)}
                        </p>
                        {auditTrail.changedFields.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {auditTrail.changedFields.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    {[auditTrail.entityType, auditTrail.entityId]
                      .filter(Boolean)
                      .join(" - ") || "-"}
                  </td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    {auditTrail.ipAddress ?? "-"}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge
                      variant="outline"
                      className={getAuditStatusBadgeClass(auditTrail.status)}
                    >
                      {auditTrail.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 align-top text-muted-foreground">
                    {formatDateTime(auditTrail.createdAt)}
                  </td>
                  <td className="px-3 py-3 text-right align-top">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t.viewAuditLogDetail}
                      onClick={() => onOpenDetail(auditTrail)}
                    >
                      <FileSearchIcon />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {isLoadingMore ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-3 text-center text-xs text-muted-foreground"
                >
                  {t.loadingMoreAuditEvents}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function isNearScrollBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 32;
}

function AuditDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/20 p-3">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}

function getAuditDialogData(
  auditTrail: AuditTrailItem,
  auditTrailDetail: AuditTrailDetailItem | null,
) {
  return auditTrailDetail ?? auditTrail;
}

function formatAuditUserDetail(
  user: AuditTrailDetailItem["actorUser"] | undefined,
  fallbackId: string | null,
) {
  if (!user) {
    return fallbackId ?? "-";
  }

  return `${user.name} <${user.email}>${user.username ? ` (@${user.username})` : ""}`;
}

function formatAuditSessionDetail(
  session: AuditTrailDetailItem["session"] | undefined,
  fallbackId: string | null,
  t: ReturnType<typeof getMessages>,
) {
  if (!session) {
    return fallbackId ?? "-";
  }

  return [
    [session.browser, session.operatingSystem]
      .filter(Boolean)
      .join(` ${t.onDevice} `),
    session.deviceName,
    session.ipAddress,
    `${t.status}: ${session.status}`,
    `${t.lastActive}: ${formatDateTime(session.lastActiveAt)}`,
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatAuditRequestDetail(
  request: AuditTrailDetailItem["request"] | undefined,
  fallbackRequestId: string | null,
) {
  if (!request) {
    return fallbackRequestId ?? "-";
  }

  return [
    request.requestId ? `id: ${request.requestId}` : null,
    request.ipAddress ? `ip: ${request.ipAddress}` : null,
  ]
    .filter(Boolean)
    .join(" - ") || "-";
}

function AuditJsonBlock({ label, value }: { label: string; value: unknown }) {
  if (!hasAuditPayload(value)) {
    return null;
  }

  return (
    <div>
      <h4 className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </h4>
      <pre className="scrollbar-minimal mt-1 max-h-56 overflow-auto rounded-lg border bg-muted/20 p-3 text-xs whitespace-pre-wrap">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
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

function formatSessionDevice(
  session: UserSessionItem,
  t?: ReturnType<typeof getMessages>,
) {
  return (
    [session.browser, session.operatingSystem]
      .filter(Boolean)
      .join(` ${t?.onDevice ?? "on"} `) ||
    t?.unknownBrowserShort ||
    "Unknown browser"
  );
}

function getAuditStatusBadgeClass(status: string) {
  switch (status.toUpperCase()) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300";
  }
}

function SecurityListSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
