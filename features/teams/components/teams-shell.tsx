"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircleIcon,
  BanIcon,
  CircleChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  RefreshCcwIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listTeamAvailableUsers } from "@/features/teams/api/teams-client";
import type {
  Team,
  TeamInput,
  TeamMember,
  TeamMemberInput,
  TeamMemberRole,
  TeamStatus,
  TeamUser,
} from "@/features/teams/api/teams-client";
import {
  useCreateTeam,
  useTeamDetail,
  useTeamsList,
} from "@/features/teams/hooks/use-teams";
import type { AuthUser } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api/http-client";
import { getMessages } from "@/lib/i18n";
import type { PaginationMeta } from "@/lib/pagination";
import { getStorageFileUrl } from "@/lib/storage-url";
import { useLanguagePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

function getTeamSchema(t: Messages) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(2, t.teamCodeMin)
      .max(30, t.teamCodeMax)
      .regex(/^[A-Za-z0-9_-]+$/, t.teamCodeInvalid),
    description: z.string().trim().max(1000, t.teamDescriptionTooLong),
    name: z
      .string()
      .trim()
      .min(2, t.teamNameMin)
      .max(120, t.teamNameMax),
    status: z.enum(["active", "inactive"]),
  });
}

type TeamFormValues = z.infer<ReturnType<typeof getTeamSchema>>;
type BreadcrumbItem = { label: string; href?: string };
type Messages = ReturnType<typeof getMessages>;
const memberPageSize = 10;
const availableUserPageSize = 20;

export function TeamsShell({ user }: { user: AuthUser }) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const teams = useTeamsList(t);
  const createTeam = useCreateTeam(t);
  const [searchDraft, setSearchDraft] = React.useState(teams.search);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const setTeamSearch = teams.setSearch;

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setTeamSearch(searchDraft.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchDraft, setTeamSearch]);

  const paginationItems = getPaginationItems(
    teams.pagination.page,
    teams.pagination.totalPages,
  );

  async function handleCreateTeam(input: TeamInput) {
    const team = await createTeam.saveTeam(input);
    setIsCreateOpen(false);
    teams.refreshTeams();

    return team;
  }

  return (
    <TeamsFrame user={user} breadcrumbItems={[{ label: t.teams }]}>
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{t.teams}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t.teamDescription}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon />
            {t.newTeam}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>{t.teamList}</CardTitle>
                <CardDescription>
                  {t.selectTeamDetailDescription}
                </CardDescription>
              </div>
              <Badge variant="secondary">
                {teams.pagination.totalCount} {t.total}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder={t.searchTeam}
                  className="pl-8"
                />
              </div>
              <StatusFilter
                status={teams.status}
                onStatusChange={teams.setStatus}
                t={t}
              />
            </div>

            {teams.isLoading ? (
              <TeamTableSkeleton />
            ) : teams.error ? (
              <ErrorState message={teams.error} onRetry={teams.refreshTeams} t={t} />
            ) : teams.teams.length === 0 ? (
              <EmptyTeamState onCreate={() => setIsCreateOpen(true)} t={t} />
            ) : (
              <TeamTable teams={teams.teams} t={t} />
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {formatMessage(t.pageOfTotal, {
                page: String(teams.pagination.totalPages === 0 ? 0 : teams.pagination.page),
                totalCount: String(teams.pagination.totalCount),
                totalPages: String(teams.pagination.totalPages),
              })}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={teams.page <= 1 || teams.isLoading}
                onClick={() => teams.setPage(Math.max(teams.page - 1, 1))}
                aria-label={t.previousPage}
              >
                <ChevronLeftIcon />
              </Button>
              {paginationItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                ) : (
                  <Button
                    key={item}
                    type="button"
                    variant={
                      item === teams.pagination.page ? "secondary" : "outline"
                    }
                    size="icon"
                    disabled={teams.isLoading}
                    onClick={() => teams.setPage(item)}
                    aria-label={formatMessage(t.pageLabel, {
                      page: String(item),
                    })}
                    aria-current={
                      item === teams.pagination.page ? "page" : undefined
                    }
                  >
                    {item}
                  </Button>
                ),
              )}
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={
                  teams.page >= teams.pagination.totalPages || teams.isLoading
                }
                onClick={() => teams.setPage(teams.page + 1)}
                aria-label={t.nextPage}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </CardFooter>
        </Card>
        <TeamCreateDialog
          isOpen={isCreateOpen}
          isSaving={createTeam.isSaving}
          onOpenChange={setIsCreateOpen}
          onSave={handleCreateTeam}
          t={t}
        />
      </main>
    </TeamsFrame>
  );
}

export function TeamDetailShell({
  teamId,
  user,
}: {
  teamId: string;
  user: AuthUser;
}) {
  const { language } = useLanguagePreference();
  const t = getMessages(language);
  const detail = useTeamDetail(teamId, t);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const title = detail.team?.name ?? t.teamDetail;

  async function handleSaveTeam(input: TeamInput) {
    const team = await detail.saveTeam(input);
    setIsEditOpen(false);

    return team;
  }

  return (
    <TeamsFrame
      user={user}
      breadcrumbItems={[
        { label: t.teams, href: "/teams" },
        { label: title },
      ]}
    >
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageTitle
            title={title}
            description={t.teamDetailDescription}
          />
          <Link
            href="/teams"
            className={buttonVariants({ variant: "outline" })}
          >
            <ChevronLeftIcon />
            {t.backToTeams}
          </Link>
        </div>

        {detail.isLoading ? (
          <TeamDetailSkeleton />
        ) : detail.error ? (
          <ErrorState message={detail.error} onRetry={detail.loadTeamDetail} t={t} />
        ) : detail.team ? (
          <div className="grid gap-6">
            <TeamDetailCard
              memberCount={detail.members.length}
              onEdit={() => setIsEditOpen(true)}
              team={detail.team}
              t={t}
            />
            <TeamMembersCard
              isMutating={detail.isMutatingMember}
              members={detail.members}
              onAddMember={detail.addMember}
              onRemoveMember={detail.removeMember}
              onUpdateMember={detail.updateMember}
              teamId={teamId}
              t={t}
            />
            <TeamEditDialog
              isOpen={isEditOpen}
              isSaving={detail.isSavingTeam}
              onDeactivate={detail.markTeamInactive}
              onOpenChange={setIsEditOpen}
              onSave={handleSaveTeam}
              team={detail.team}
              t={t}
            />
          </div>
        ) : null}
      </main>
    </TeamsFrame>
  );
}

function TeamDetailCard({
  memberCount,
  onEdit,
  team,
  t,
}: {
  memberCount: number;
  onEdit: () => void;
  team: Team;
  t: Messages;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <span className="break-words">{team.name}</span>
              <StatusBadge status={team.status} t={t} />
            </CardTitle>
            <CardDescription>
              {t.teamDetailCardDescription}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={onEdit}>
            <PencilIcon />
            {t.editTeam}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DetailItem label={t.code} value={team.code} />
          <DetailItem label={t.members} value={String(memberCount)} />
          <DetailItem label={t.created} value={formatDateTime(team.createdAt)} />
          <DetailItem label={t.updated} value={formatDateTime(team.updatedAt)} />
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            {t.description}
          </dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
            {team.description || "-"}
          </dd>
        </div>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <dt className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function TeamEditDialog({
  isOpen,
  isSaving,
  onDeactivate,
  onOpenChange,
  onSave,
  team,
  t,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onDeactivate: () => Promise<Team | null>;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (input: TeamInput) => Promise<Team>;
  team: Team;
  t: Messages;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.editTeam}</DialogTitle>
          <DialogDescription>
            {t.teamIdentityDescription}
          </DialogDescription>
        </DialogHeader>
        <TeamForm
          isSaving={isSaving}
          mode="update"
          onDeactivate={onDeactivate}
          onSave={onSave}
          surface="plain"
          team={team}
          t={t}
        />
      </DialogContent>
    </Dialog>
  );
}

function TeamCreateDialog({
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  t,
}: {
  isOpen: boolean;
  isSaving: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (input: TeamInput) => Promise<Team>;
  t: Messages;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.createTeam}</DialogTitle>
          <DialogDescription>
            {t.createTeamDescription}
          </DialogDescription>
        </DialogHeader>
        <TeamForm
          isSaving={isSaving}
          mode="create"
          onSave={onSave}
          surface="plain"
          team={null}
          t={t}
        />
      </DialogContent>
    </Dialog>
  );
}

function TeamsFrame({
  breadcrumbItems,
  children,
  user,
}: {
  breadcrumbItems: BreadcrumbItem[];
  children: React.ReactNode;
  user: AuthUser;
}) {
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
            <PageBreadcrumb items={breadcrumbItems} />
          </div>
          <div className="ml-auto px-4">
            <LanguageSwitcher />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

function PageTitle({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StatusFilter({
  status,
  onStatusChange,
  t,
}: {
  status: TeamStatus | "all";
  onStatusChange: (status: TeamStatus | "all") => void;
  t?: Messages;
}) {
  const items = [
    ["all", t?.all ?? "All"],
    ["active", t?.active ?? "Active"],
    ["inactive", t?.inactive ?? "Inactive"],
  ] as const;

  return (
    <div className="grid grid-cols-3 rounded-lg border bg-muted/30 p-1">
      {items.map(([value, label]) => (
        <Button
          key={value}
          type="button"
          variant={status === value ? "secondary" : "ghost"}
          size="sm"
          className="h-7"
          onClick={() => onStatusChange(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

function TeamTable({ teams, t }: { teams: Team[]; t: Messages }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="scrollbar-minimal overflow-x-auto">
        <table className="w-full min-w-[780px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">{t.teams}</th>
              <th className="px-3 py-2 text-left font-medium">{t.code}</th>
              <th className="px-3 py-2 text-left font-medium">{t.members}</th>
              <th className="px-3 py-2 text-left font-medium">{t.status}</th>
              <th className="px-3 py-2 text-left font-medium">{t.updated}</th>
              <th className="px-3 py-2 text-right font-medium">{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b last:border-b-0">
                <td className="px-3 py-3 align-top">
                  <div className="flex items-start gap-2">
                    <AvatarMark name={team.name} src={null} />
                    <div className="min-w-0">
                      <p className="font-medium">{team.name}</p>
                      {team.description ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {team.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {team.code}
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {team.memberCount}
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusBadge status={team.status} t={t} />
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">
                  {formatDateTime(team.updatedAt)}
                </td>
                <td className="px-3 py-3 text-right align-top">
                  <Link
                    href={`/teams/${team.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                    })}
                    aria-label={formatMessage(t.openTeam, { name: team.name })}
                  >
                    <CircleChevronRightIcon />
                    {t.detail}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamForm({
  isSaving,
  mode,
  onDeactivate,
  onSave,
  team,
  surface = "card",
  t,
}: {
  isSaving: boolean;
  mode: "create" | "update";
  onDeactivate?: () => Promise<Team | null>;
  onSave: (input: TeamInput) => Promise<Team>;
  surface?: "card" | "plain";
  team: Team | null;
  t: Messages;
}) {
  const [pendingInput, setPendingInput] = React.useState<TeamInput | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(getTeamSchema(t)),
    defaultValues: getTeamDefaultValues(team),
    mode: "onBlur",
  });
  const {
    control,
    formState: { errors, isDirty },
    register,
    reset,
    setValue,
  } = form;
  const status = useWatch({
    control,
    name: "status",
  });
  const isCreate = mode === "create";

  React.useEffect(() => {
    reset(getTeamDefaultValues(team));
  }, [reset, team]);

  function submitForm(values: TeamFormValues) {
    setPendingInput({
      code: values.code.trim().toUpperCase(),
      description: values.description.trim() || null,
      name: values.name.trim(),
      status: values.status,
    });
    setIsConfirmOpen(true);
  }

  async function confirmSubmit() {
    if (!pendingInput) {
      return;
    }

    const savedTeam = await onSave(pendingInput);
    reset(getTeamDefaultValues(savedTeam));
    setPendingInput(null);
    setIsConfirmOpen(false);
  }

  async function handleDeactivate() {
    if (!team || team.status === "inactive" || !onDeactivate) {
      return;
    }

    const confirmed = window.confirm(
      formatMessage(t.deactivateTeamConfirm, { name: team.name }),
    );

    if (confirmed) {
      const updatedTeam = await onDeactivate();

      if (updatedTeam) {
        reset(getTeamDefaultValues(updatedTeam));
      }
    }
  }

  const formContent = (
    <>
      <form onSubmit={form.handleSubmit(submitForm)}>
        {surface === "card" ? (
          <CardContent>
            <TeamFormFields
              errors={errors}
              register={register}
              setValue={setValue}
              status={status}
              t={t}
            />
          </CardContent>
        ) : (
          <div className="py-1">
            <TeamFormFields
              errors={errors}
              register={register}
              setValue={setValue}
              status={status}
              t={t}
            />
          </div>
        )}
        {surface === "card" ? (
          <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
            {isCreate ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => reset(getTeamDefaultValues(team))}
              >
                <RefreshCcwIcon />
                {t.retry}
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={!team || team.status === "inactive" || isSaving}
                onClick={handleDeactivate}
              >
                <BanIcon />
                {t.deactivate}
              </Button>
            )}
            <Button type="submit" disabled={isSaving || !isDirty}>
              <SaveIcon />
              {isSaving ? t.saving : isCreate ? t.createTeam : t.saveTeam}
            </Button>
          </CardFooter>
        ) : (
          <DialogFooter className="mt-5 sm:justify-between">
            {!isCreate ? (
              <Button
                type="button"
                variant="destructive"
                disabled={!team || team.status === "inactive" || isSaving}
                onClick={handleDeactivate}
              >
                <BanIcon />
                {t.deactivate}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose
                render={
                  <Button type="button" variant="outline" disabled={isSaving} />
                }
              >
                {t.cancel}
              </DialogClose>
              <Button type="submit" disabled={isSaving || !isDirty}>
                <SaveIcon />
                {isSaving
                  ? t.saving
                  : isCreate
                    ? t.createTeam
                    : t.saveTeam}
              </Button>
            </div>
          </DialogFooter>
        )}
      </form>
      <ConfirmActionDialog
        actionLabel={isCreate ? t.createTeam : t.saveTeam}
        description={
          isCreate
            ? t.confirmCreateTeamDescription
            : t.confirmSaveTeamDescription
        }
        isOpen={isConfirmOpen}
        isPending={isSaving}
        onConfirm={confirmSubmit}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);

          if (!open && !isSaving) {
            setPendingInput(null);
          }
        }}
        title={isCreate ? t.confirmCreateTeamTitle : t.confirmSaveTeamTitle}
        t={t}
      />
    </>
  );

  if (surface === "plain") {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isCreate ? t.createTeam : t.teamDetails}</CardTitle>
        <CardDescription>
          {isCreate
            ? t.createTeamDescription
            : t.teamIdentityDescription}
        </CardDescription>
      </CardHeader>
      {formContent}
    </Card>
  );
}

function TeamFormFields({
  errors,
  register,
  setValue,
  status,
  t,
}: {
  errors: ReturnType<typeof useForm<TeamFormValues>>["formState"]["errors"];
  register: ReturnType<typeof useForm<TeamFormValues>>["register"];
  setValue: ReturnType<typeof useForm<TeamFormValues>>["setValue"];
  status: TeamFormValues["status"];
  t: Messages;
}) {
  return (
    <FieldGroup>
      <div className="grid gap-4 md:grid-cols-2">
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="team-name">{t.name}</FieldLabel>
          <Input
            id="team-name"
            placeholder={t.teamNamePlaceholder}
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>
        <Field data-invalid={Boolean(errors.code)}>
          <FieldLabel htmlFor="team-code">{t.code}</FieldLabel>
          <Input
            id="team-code"
            placeholder="FIN"
            aria-invalid={Boolean(errors.code)}
            {...register("code")}
          />
          <FieldDescription>
            {t.shortCodeHelp}
          </FieldDescription>
          <FieldError>{errors.code?.message}</FieldError>
        </Field>
      </div>
      <Field data-invalid={Boolean(errors.status)}>
        <FieldLabel>{t.status}</FieldLabel>
        <div className="grid max-w-sm grid-cols-2 rounded-lg border bg-muted/30 p-1">
          {(["active", "inactive"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={status === value ? "secondary" : "ghost"}
              size="sm"
              className="h-7"
              onClick={() =>
                setValue("status", value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              {value}
            </Button>
          ))}
        </div>
        <FieldError>{errors.status?.message}</FieldError>
      </Field>
      <Field data-invalid={Boolean(errors.description)}>
        <FieldLabel htmlFor="team-description">{t.description}</FieldLabel>
        <Textarea
          id="team-description"
          placeholder={t.teamDescriptionPlaceholder}
          aria-invalid={Boolean(errors.description)}
          {...register("description")}
        />
        <FieldError>{errors.description?.message}</FieldError>
      </Field>
    </FieldGroup>
  );
}

function TeamMembersCard({
  isMutating,
  members,
  onAddMember,
  onRemoveMember,
  onUpdateMember,
  teamId,
  t,
}: {
  isMutating: boolean;
  members: TeamMember[];
  onAddMember: (input: TeamMemberInput) => Promise<TeamMember | null>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onUpdateMember: (
    memberId: string,
    input: { role: TeamMemberRole; isPrimary: boolean },
  ) => Promise<TeamMember | null>;
  teamId: string;
  t: Messages;
}) {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const totalPages = Math.ceil(members.length / memberPageSize);
  const safePage = Math.min(Math.max(page, 1), totalPages || 1);
  const memberPageItems = getPaginationItems(safePage, totalPages);
  const visibleMembers = members.slice(
    (safePage - 1) * memberPageSize,
    safePage * memberPageSize,
  );

  async function handleAddMember(input: TeamMemberInput) {
    const member = await onAddMember(input);
    setIsAddOpen(false);

    return member;
  }

  function goToPage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 1), totalPages || 1));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="size-4 text-muted-foreground" />
              {t.manageMembers}
            </CardTitle>
            <CardDescription>
              {t.teamMembersDescription}
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon />
            {t.addMember}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <UsersIcon className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{t.noMembersYet}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.noMembersYetDescription}
            </p>
          </div>
        ) : (
          <TeamMemberTable
            disabled={isMutating}
            members={visibleMembers}
            onRemoveMember={onRemoveMember}
            onUpdateMember={onUpdateMember}
            t={t}
          />
        )}
      </CardContent>
      {members.length > 0 ? (
        <CardFooter className="flex-col gap-3 border-t sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {formatMessage(t.pageOfTotal, {
              page: String(totalPages === 0 ? 0 : safePage),
              totalCount: String(members.length),
              totalPages: String(totalPages),
            })}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={safePage <= 1 || isMutating}
              onClick={() => goToPage(safePage - 1)}
              aria-label={t.previousMemberPage}
            >
              <ChevronLeftIcon />
            </Button>
            {memberPageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`member-ellipsis-${index}`}
                  className="flex h-8 min-w-8 items-center justify-center text-sm text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === safePage ? "secondary" : "outline"}
                  size="icon"
                  disabled={isMutating}
                  onClick={() => goToPage(item)}
                  aria-label={formatMessage(t.memberPage, {
                    page: String(item),
                  })}
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={safePage >= totalPages || isMutating}
              onClick={() => goToPage(safePage + 1)}
              aria-label={t.nextMemberPage}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </CardFooter>
      ) : null}
      <AddMemberDialog
        isMutating={isMutating}
        isOpen={isAddOpen}
        onAddMember={handleAddMember}
        onOpenChange={setIsAddOpen}
        teamId={teamId}
        t={t}
      />
    </Card>
  );
}

function AddMemberDialog({
  isMutating,
  isOpen,
  onAddMember,
  onOpenChange,
  teamId,
  t,
}: {
  isMutating: boolean;
  isOpen: boolean;
  onAddMember: (input: TeamMemberInput) => Promise<TeamMember | null>;
  onOpenChange: (isOpen: boolean) => void;
  teamId: string;
  t: Messages;
}) {
  const [availableUsers, setAvailableUsers] = React.useState<TeamUser[]>([]);
  const [availableUsersPagination, setAvailableUsersPagination] =
    React.useState<PaginationMeta>({
      page: 1,
      pageSize: availableUserPageSize,
      totalCount: 0,
      totalPages: 0,
    });
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = React.useState(false);
  const [searchDraft, setSearchDraft] = React.useState("");
  const [userId, setUserId] = React.useState("");
  const [role, setRole] = React.useState<TeamMemberRole>("member");
  const [isPrimary, setIsPrimary] = React.useState(true);
  const [pendingInput, setPendingInput] =
    React.useState<TeamMemberInput | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const selectedUserId = availableUsers.some((user) => user.id === userId)
    ? userId
    : (availableUsers[0]?.id ?? "");
  const selectedUser = availableUsers.find((user) => user.id === selectedUserId);
  const hasMoreUsers =
    availableUsersPagination.page < availableUsersPagination.totalPages;

  const loadAvailableUsers = React.useCallback(
    async (page: number, mode: "replace" | "append", search: string) => {
      if (mode === "replace") {
        setIsLoadingUsers(true);
      } else {
        setIsLoadingMoreUsers(true);
      }

      try {
        const payload = await listTeamAvailableUsers(teamId, {
          page,
          pageSize: availableUserPageSize,
          search,
        });
        setAvailableUsers((currentUsers) =>
          mode === "append"
            ? mergeUsersById(currentUsers, payload.users)
            : payload.users,
        );
        setAvailableUsersPagination(payload.pagination);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, t.availableUsersLoadFailed),
        );
      } finally {
        if (mode === "replace") {
          setIsLoadingUsers(false);
        } else {
          setIsLoadingMoreUsers(false);
        }
      }
    },
    [teamId, t.availableUsersLoadFailed],
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timeout = window.setTimeout(() => {
      loadAvailableUsers(1, "replace", searchDraft.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [isOpen, loadAvailableUsers, searchDraft]);

  function loadMoreAvailableUsers() {
    if (isLoadingUsers || isLoadingMoreUsers || !hasMoreUsers) {
      return;
    }

    loadAvailableUsers(
      availableUsersPagination.page + 1,
      "append",
      searchDraft.trim(),
    );
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedUserId) {
      return;
    }

    setPendingInput({
      userId: selectedUserId,
      role,
      isPrimary,
    });
    setIsConfirmOpen(true);
  }

  async function confirmAddMember() {
    if (!pendingInput) {
      return;
    }

    await onAddMember(pendingInput);
    setUserId("");
    setRole("member");
    setIsPrimary(true);
    setPendingInput(null);
    setIsConfirmOpen(false);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t.addMember}</DialogTitle>
            <DialogDescription>
              {t.addMemberDescription}
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitForm}>
            <Field>
              <FieldLabel htmlFor="team-member-user">{t.user}</FieldLabel>
              <input type="hidden" name="userId" value={selectedUserId} />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      id="team-member-user"
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto min-h-8 w-full justify-between gap-3 py-1.5 text-left"
                      disabled={
                        availableUsers.length === 0 ||
                        isLoadingUsers ||
                        isMutating
                      }
                    />
                  }
                >
                  <span className="min-w-0">
                    <span className="block truncate">
                      {isLoadingUsers
                        ? t.loadingUsers
                        : selectedUser?.name ?? t.noAvailableUsers}
                    </span>
                    {selectedUser ? (
                      <span className="block truncate text-xs font-normal text-muted-foreground">
                        {selectedUser.email}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  onScroll={(event) => {
                    if (isNearScrollBottom(event.currentTarget)) {
                      loadMoreAvailableUsers();
                    }
                  }}
                >
                  <div className="sticky top-0 z-10 bg-popover p-1">
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="team-member-user-search"
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                        onKeyDownCapture={(event) => event.stopPropagation()}
                        onKeyUpCapture={(event) => event.stopPropagation()}
                        placeholder={t.userSearchPlaceholder}
                        className="h-8 pl-8"
                        disabled={isMutating}
                      />
                    </div>
                  </div>
                  <DropdownMenuRadioGroup
                    value={selectedUserId}
                    onValueChange={setUserId}
                  >
                    {availableUsers.map((user) => (
                      <DropdownMenuRadioItem key={user.id} value={user.id}>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {user.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                    {isLoadingMoreUsers ? (
                      <div className="px-1.5 py-2 text-xs text-muted-foreground">
                        {t.loadingMoreUsers}
                      </div>
                    ) : null}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {availableUsers.length === 0 && !isLoadingUsers ? (
                <p className="text-xs text-muted-foreground">
                  {t.noAvailableUsersFound}
                </p>
              ) : null}
            </Field>
            <RoleControl role={role} onRoleChange={setRole} />
            <PrimaryMemberSwitch
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
              t={t}
            />
            <DialogFooter>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isMutating}
                  />
                }
              >
                {t.cancel}
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  !selectedUserId || availableUsers.length === 0 || isMutating
                }
              >
                <PlusIcon />
                {t.addMember}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmActionDialog
        actionLabel={t.addMember}
        description={t.addMemberConfirmDescription}
        isOpen={isConfirmOpen}
        isPending={isMutating}
        onConfirm={confirmAddMember}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);

          if (!open && !isMutating) {
            setPendingInput(null);
          }
        }}
        title={t.addMemberConfirmTitle}
        t={t}
      />
    </>
  );
}

function TeamMemberTable({
  disabled,
  members,
  onRemoveMember,
  onUpdateMember,
  t,
}: {
  disabled: boolean;
  members: TeamMember[];
  onRemoveMember: (memberId: string) => Promise<void>;
  onUpdateMember: (
    memberId: string,
    input: { role: TeamMemberRole; isPrimary: boolean },
  ) => Promise<TeamMember | null>;
  t: Messages;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="scrollbar-minimal overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium">{t.member}</th>
              <th className="px-3 py-2 text-left font-medium">{t.role}</th>
              <th className="px-3 py-2 text-left font-medium">{t.primary}</th>
              <th className="px-3 py-2 text-left font-medium">{t.joined}</th>
              <th className="px-3 py-2 text-right font-medium">{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <TeamMemberTableRow
                key={member.id}
                disabled={disabled}
                member={member}
                onRemove={() => onRemoveMember(member.id)}
                onUpdate={(input) => onUpdateMember(member.id, input)}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamMemberTableRow({
  disabled,
  member,
  onRemove,
  onUpdate,
  t,
}: {
  disabled: boolean;
  member: TeamMember;
  onRemove: () => Promise<void>;
  onUpdate: (input: {
    role: TeamMemberRole;
    isPrimary: boolean;
  }) => Promise<TeamMember | null>;
  t: Messages;
}) {
  async function handleRemove() {
    const confirmed = window.confirm(
      formatMessage(t.removeMemberConfirm, { name: member.user.name }),
    );

    if (confirmed) {
      await onRemove();
    }
  }

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-3 align-top">
        <div className="flex min-w-0 items-center gap-2">
          <AvatarMark name={member.user.name} src={member.user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate font-medium">{member.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {member.user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3 align-top">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-32 justify-between"
                disabled={disabled}
              />
            }
          >
            {member.role === "manager" ? "manager" : "member"}
            <ChevronDownIcon data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-32">
            <DropdownMenuRadioGroup
              value={member.role === "manager" ? "manager" : "member"}
              onValueChange={(value) =>
                onUpdate({
                  role: value as TeamMemberRole,
                  isPrimary: member.isPrimary,
                })
              }
            >
              <DropdownMenuRadioItem value="member">
                member
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="manager">
                manager
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
      <td className="px-3 py-3 align-top">
        <Switch
          checked={member.isPrimary}
          disabled={disabled}
          aria-label={formatMessage(t.primaryMemberForUser, {
            name: member.user.name,
          })}
          onCheckedChange={(checked) =>
            onUpdate({
              role: member.role === "manager" ? "manager" : "member",
              isPrimary: checked,
            })
          }
        />
      </td>
      <td className="px-3 py-3 align-top text-muted-foreground">
        {formatDateTime(member.joinedAt)}
      </td>
      <td className="px-3 py-3 text-right align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={handleRemove}
          aria-label={t.removeMember}
        >
          <Trash2Icon />
        </Button>
      </td>
    </tr>
  );
}

function RoleControl({
  disabled,
  role,
  onRoleChange,
}: {
  disabled?: boolean;
  role: TeamMemberRole;
  onRoleChange: (role: TeamMemberRole) => void;
}) {
  return (
    <Field>
      <FieldLabel>role</FieldLabel>
      <div className="grid grid-cols-2 rounded-lg border bg-muted/30 p-1">
        {(["member", "manager"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant={role === value ? "secondary" : "ghost"}
            size="sm"
            className="h-7"
            disabled={disabled}
            onClick={() => onRoleChange(value)}
          >
            {value}
          </Button>
        ))}
      </div>
    </Field>
  );
}

function PrimaryMemberSwitch({
  checked,
  disabled,
  onCheckedChange,
  t,
}: {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  t?: Messages;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
      <div>
        <p className="text-sm font-medium">{t?.primaryMember ?? "Primary member"}</p>
        <p className="text-xs text-muted-foreground">
          {t?.offMeansTemporaryMember ?? "Off means temporary member."}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-label={t?.primaryMember ?? "Primary member"}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

function StatusBadge({ status, t }: { status: string; t?: Messages }) {
  const isActive = status === "active";

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300",
      )}
    >
      {status === "inactive" ? (t?.inactive ?? status) : (t?.active ?? status)}
    </Badge>
  );
}

function AvatarMark({ name, src }: { name: string; src: string | null }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-xs font-semibold text-muted-foreground"
      style={
        src
          ? {
              backgroundImage: `url("${getStorageFileUrl(src)}")`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {src ? <span className="sr-only">{name}</span> : initials}
    </span>
  );
}

function TeamTableSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
    </div>
  );
}

function TeamDetailSkeleton() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-64 rounded-lg" />
      <Skeleton className="h-[520px] rounded-lg" />
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
  t,
}: {
  message: string;
  onRetry: () => void;
  t?: Messages;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-destructive sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
        <p className="text-sm">{message}</p>
      </div>
      <Button type="button" variant="outline" onClick={onRetry}>
        <RefreshCcwIcon />
        {t?.retry ?? "Retry"}
      </Button>
    </div>
  );
}

function EmptyTeamState({ onCreate, t }: { onCreate: () => void; t: Messages }) {
  return (
    <div className="grid gap-3 rounded-lg border border-dashed p-6 text-center">
      <UsersIcon className="mx-auto size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium">{t.noTeamsFound}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.noTeamsFoundDescription}
        </p>
      </div>
      <Button type="button" variant="outline" className="mx-auto" onClick={onCreate}>
        <PlusIcon />
        {t.newTeam}
      </Button>
    </div>
  );
}

function ConfirmActionDialog({
  actionLabel,
  description,
  isOpen,
  isPending,
  onConfirm,
  onOpenChange,
  t,
  title,
}: {
  actionLabel: string;
  description: string;
  isOpen: boolean;
  isPending: boolean;
  onConfirm: () => Promise<void>;
  onOpenChange: (isOpen: boolean) => void;
  t: Messages;
  title: string;
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {isPending ? t.saving : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function getTeamDefaultValues(team: Team | null): TeamFormValues {
  return {
    code: team?.code ?? "",
    description: team?.description ?? "",
    name: team?.name ?? "",
    status: team?.status === "inactive" ? "inactive" : "active",
  };
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 0) {
    return [] as Array<number | "ellipsis">;
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = new Set<number>([
    1,
    totalPages,
    currentPage,
    Math.max(1, currentPage - 1),
    Math.min(totalPages, currentPage + 1),
  ]);
  const sortedItems = Array.from(items).sort((first, second) => first - second);

  return sortedItems.reduce<Array<number | "ellipsis">>((acc, item) => {
    const previous = acc[acc.length - 1];

    if (typeof previous === "number" && item - previous > 1) {
      acc.push("ellipsis");
    }

    acc.push(item);

    return acc;
  }, []);
}

function isNearScrollBottom(element: HTMLElement) {
  return element.scrollHeight - element.scrollTop - element.clientHeight < 32;
}

function mergeUsersById(currentUsers: TeamUser[], nextUsers: TeamUser[]) {
  const usersById = new Map<string, TeamUser>();

  for (const user of currentUsers) {
    usersById.set(user.id, user);
  }

  for (const user of nextUsers) {
    usersById.set(user.id, user);
  }

  return Array.from(usersById.values());
}

function formatMessage(message: string, values: Record<string, string>) {
  return Object.entries(values).reduce(
    (currentMessage, [key, value]) =>
      currentMessage.replaceAll(`{${key}}`, value),
    message,
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
