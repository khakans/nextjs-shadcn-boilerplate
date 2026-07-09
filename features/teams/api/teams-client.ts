import { apiRequest } from "@/lib/api/http-client";
import type { PaginationMeta } from "@/lib/pagination";

export type TeamStatus = "active" | "inactive";
export type TeamMemberRole = "manager" | "member";

export type Team = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TeamInput = {
  name: string;
  code: string;
  description: string | null;
  status: TeamStatus;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  user: TeamUser;
};

export type TeamUser = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
};

export type TeamMemberInput = {
  userId: string;
  role: TeamMemberRole;
  isPrimary: boolean;
};

export type TeamMemberUpdateInput = {
  role: TeamMemberRole;
  isPrimary: boolean;
};

type TeamsResponse = {
  teams: Team[];
  pagination: PaginationMeta;
};

type TeamResponse = {
  team: Team;
};

type TeamDetailResponse = {
  team: Team;
  members: TeamMember[];
  availableUsers: TeamUser[];
};

type TeamAvailableUsersResponse = {
  users: TeamUser[];
  pagination: PaginationMeta;
};

type TeamMemberResponse = {
  member: TeamMember;
};

type OkResponse = {
  ok: true;
};

export type ListTeamsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TeamStatus | "all";
};

export type ListTeamAvailableUsersParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export function listTeams(params: ListTeamsParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.status && params.status !== "all") {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();

  return apiRequest<TeamsResponse>(`/teams${query ? `?${query}` : ""}`);
}

export function createTeam(input: TeamInput) {
  return apiRequest<TeamResponse>("/teams", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function getTeamDetail(teamId: string) {
  return apiRequest<TeamDetailResponse>(`/teams/${teamId}`);
}

export function listTeamAvailableUsers(
  teamId: string,
  params: ListTeamAvailableUsersParams = {},
) {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.pageSize) {
    searchParams.set("pageSize", String(params.pageSize));
  }

  if (params.search) {
    searchParams.set("search", params.search);
  }

  const query = searchParams.toString();

  return apiRequest<TeamAvailableUsersResponse>(
    `/teams/${teamId}/available-users${query ? `?${query}` : ""}`,
  );
}

export function updateTeam(teamId: string, input: TeamInput) {
  return apiRequest<TeamResponse>(`/teams/${teamId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function deactivateTeam(teamId: string) {
  return apiRequest<TeamResponse>(`/teams/${teamId}`, {
    method: "DELETE",
  });
}

export function addTeamMember(teamId: string, input: TeamMemberInput) {
  return apiRequest<TeamMemberResponse>(`/teams/${teamId}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function updateTeamMember(
  teamId: string,
  memberId: string,
  input: TeamMemberUpdateInput,
) {
  return apiRequest<TeamMemberResponse>(`/teams/${teamId}/members/${memberId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export function removeTeamMember(teamId: string, memberId: string) {
  return apiRequest<OkResponse>(`/teams/${teamId}/members/${memberId}`, {
    method: "DELETE",
  });
}
