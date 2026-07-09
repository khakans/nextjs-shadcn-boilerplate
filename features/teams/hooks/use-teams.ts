"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  addTeamMember,
  createTeam,
  deactivateTeam,
  getTeamDetail,
  listTeams,
  removeTeamMember,
  updateTeam,
  updateTeamMember,
  type Team,
  type TeamInput,
  type TeamMember,
  type TeamMemberInput,
  type TeamMemberUpdateInput,
  type TeamStatus,
  type TeamUser,
} from "@/features/teams/api/teams-client";
import { getApiErrorMessage } from "@/lib/api/http-client";
import type { getMessages } from "@/lib/i18n";
import type { PaginationMeta } from "@/lib/pagination";

const pageSize = 10;
type Messages = ReturnType<typeof getMessages>;

export function useTeamsList(t: Messages) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    pageSize,
    totalCount: 0,
    totalPages: 0,
  });
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<TeamStatus | "all">("all");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadTeamsPage = React.useCallback(
    async (pageToLoad: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await listTeams({
          page: pageToLoad,
          pageSize,
          search,
          status,
        });
        setTeams(payload.teams);
        setPagination(payload.pagination);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, t.teamLoadFailed));
      } finally {
        setIsLoading(false);
      }
    },
    [search, status, t.teamLoadFailed],
  );

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadTeamsPage(page);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadTeamsPage, page]);

  const updateSearch = React.useCallback((value: string) => {
    setPage(1);
    setSearch(value);
  }, []);

  const updateStatus = React.useCallback((value: TeamStatus | "all") => {
    setPage(1);
    setStatus(value);
  }, []);

  return {
    error,
    isLoading,
    page,
    pagination,
    refreshTeams: () => loadTeamsPage(page),
    search,
    setPage,
    setSearch: updateSearch,
    setStatus: updateStatus,
    status,
    teams,
  };
}

export function useCreateTeam(t: Messages) {
  const [isSaving, setIsSaving] = React.useState(false);

  async function saveTeam(input: TeamInput) {
    setIsSaving(true);

    try {
      const payload = await createTeam(input);
      toast.success(t.teamCreated);

      return payload.team;
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, t.teamCreateFailed));
      throw saveError;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    isSaving,
    saveTeam,
  };
}

export function useTeamDetail(teamId: string, t: Messages) {
  const [team, setTeam] = React.useState<Team | null>(null);
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = React.useState<TeamUser[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingTeam, setIsSavingTeam] = React.useState(false);
  const [isMutatingMember, setIsMutatingMember] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadTeamDetail = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const payload = await getTeamDetail(teamId);
      setTeam(payload.team);
      setMembers(payload.members);
      setAvailableUsers(payload.availableUsers);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, t.teamDetailLoadFailed));
    } finally {
      setIsLoading(false);
    }
  }, [teamId, t.teamDetailLoadFailed]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadTeamDetail();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadTeamDetail]);

  async function saveTeam(input: TeamInput) {
    setIsSavingTeam(true);

    try {
      const payload = await updateTeam(teamId, input);
      toast.success(t.teamUpdated);
      setTeam(payload.team);

      return payload.team;
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, t.teamUpdateFailed));
      throw saveError;
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function markTeamInactive() {
    if (!team) {
      return null;
    }

    setIsSavingTeam(true);

    try {
      const payload = await deactivateTeam(teamId);
      toast.success(t.teamDeactivated);
      setTeam(payload.team);

      return payload.team;
    } catch (deactivateError) {
      toast.error(
        getApiErrorMessage(deactivateError, t.teamDeactivateFailed),
      );
      throw deactivateError;
    } finally {
      setIsSavingTeam(false);
    }
  }

  async function addMember(input: TeamMemberInput) {
    setIsMutatingMember(true);

    try {
      const payload = await addTeamMember(teamId, input);
      toast.success(t.teamMemberAdded);
      await loadTeamDetail();

      return payload.member;
    } catch (memberError) {
      toast.error(getApiErrorMessage(memberError, t.teamMemberAddFailed));
      throw memberError;
    } finally {
      setIsMutatingMember(false);
    }
  }

  async function updateMember(memberId: string, input: TeamMemberUpdateInput) {
    setIsMutatingMember(true);

    try {
      const payload = await updateTeamMember(teamId, memberId, input);
      toast.success(t.teamMemberUpdated);
      await loadTeamDetail();

      return payload.member;
    } catch (memberError) {
      toast.error(getApiErrorMessage(memberError, t.teamMemberUpdateFailed));
      throw memberError;
    } finally {
      setIsMutatingMember(false);
    }
  }

  async function removeMember(memberId: string) {
    setIsMutatingMember(true);

    try {
      await removeTeamMember(teamId, memberId);
      toast.success(t.teamMemberRemoved);
      await loadTeamDetail();
    } catch (memberError) {
      toast.error(getApiErrorMessage(memberError, t.teamMemberRemoveFailed));
      throw memberError;
    } finally {
      setIsMutatingMember(false);
    }
  }

  return {
    addMember,
    availableUsers,
    error,
    isLoading,
    isMutatingMember,
    isSavingTeam,
    loadTeamDetail,
    markTeamInactive,
    members,
    removeMember,
    saveTeam,
    team,
    updateMember,
  };
}
