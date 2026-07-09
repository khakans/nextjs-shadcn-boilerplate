import { ApiError } from "@/lib/api-response";
import { getCurrentUserFromRequest } from "@/lib/auth";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PaginationMeta } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

import type {
  TeamAvailableUserQuery,
  TeamListQuery,
  TeamMemberRequest,
  TeamMemberUpdateRequest,
  TeamRequest,
} from "./request";

export type TeamItem = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TeamMemberItem = {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    avatarUrl: string | null;
  };
};

export type TeamAvailableUserItem = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
};

export async function listTeamsService(query: TeamListQuery, request: Request) {
  await requireTeamUser(request);

  const where: Prisma.TeamWhereInput = {
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              code: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const [totalCount, teams] = await Promise.all([
    prisma.team.count({
      where,
    }),
    prisma.team.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: [
        {
          updatedAt: "desc",
        },
        {
          name: "asc",
        },
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    teams: teams.map(toTeamItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    } satisfies PaginationMeta,
  };
}

export async function getTeamDetailService(teamId: string, request: Request) {
  await requireTeamUser(request);

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
      members: {
        include: {
          user: {
            select: teamMemberUserSelect,
          },
        },
        orderBy: [
          {
            isPrimary: "desc",
          },
          {
            joinedAt: "asc",
          },
        ],
      },
    },
  });

  if (!team) {
    throw new ApiError("Team not found.", 404);
  }

  const memberUserIds = team.members.map((member) => member.userId);
  const availableUsers = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(memberUserIds.length > 0
        ? {
            id: {
              notIn: memberUserIds,
            },
          }
        : {}),
    },
    select: teamMemberUserSelect,
    orderBy: {
      name: "asc",
    },
    take: 100,
  });

  return {
    team: toTeamItem(team),
    members: team.members.map(toTeamMemberItem),
    availableUsers,
  };
}

export async function listTeamAvailableUsersService(
  teamId: string,
  query: TeamAvailableUserQuery,
  request: Request,
) {
  await requireTeamUser(request);
  await assertTeamExists(teamId);

  const where: Prisma.UserWhereInput = {
    isActive: true,
    teamMembers: {
      none: {
        teamId,
      },
    },
    ...(query.search
      ? {
          OR: [
            {
              name: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: query.search,
                mode: "insensitive",
              },
            },
            {
              username: {
                contains: query.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [totalCount, users] = await Promise.all([
    prisma.user.count({
      where,
    }),
    prisma.user.findMany({
      where,
      select: teamMemberUserSelect,
      orderBy: [
        {
          name: "asc",
        },
        {
          email: "asc",
        },
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    users,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    } satisfies PaginationMeta,
  };
}

export async function createTeamService(input: TeamRequest, request: Request) {
  await requireTeamUser(request);
  await assertTeamCodeAvailable(input.code);

  const team = await auditAction(auditTrailActions.teamCreated, () =>
    prisma.team.create({
      data: input,
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    }),
  );

  return {
    team: toTeamItem(team),
  };
}

export async function updateTeamService(
  teamId: string,
  input: TeamRequest,
  request: Request,
) {
  await requireTeamUser(request);
  await assertTeamExists(teamId);
  await assertTeamCodeAvailable(input.code, teamId);

  const team = await auditAction(auditTrailActions.teamUpdated, () =>
    prisma.team.update({
      where: {
        id: teamId,
      },
      data: input,
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    }),
  );

  return {
    team: toTeamItem(team),
  };
}

export async function deactivateTeamService(teamId: string, request: Request) {
  await requireTeamUser(request);
  await assertTeamExists(teamId);

  const team = await auditAction(auditTrailActions.teamDeactivated, () =>
    prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        status: "inactive",
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    }),
  );

  return {
    team: toTeamItem(team),
  };
}

export async function addTeamMemberService(
  teamId: string,
  input: TeamMemberRequest,
  request: Request,
) {
  await requireTeamUser(request);
  await assertTeamExists(teamId);
  await assertUserExists(input.userId);

  const existingMember = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId: input.userId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingMember) {
    throw new ApiError("User is already a member of this team.", 409);
  }

  const member = await auditAction(auditTrailActions.teamMemberAdded, () =>
    prisma.teamMember.create({
      data: {
        teamId,
        userId: input.userId,
        role: input.role,
        isPrimary: input.isPrimary,
      },
      include: {
        user: {
          select: teamMemberUserSelect,
        },
      },
    }),
  );

  return {
    member: toTeamMemberItem(member),
  };
}

export async function updateTeamMemberService(
  teamId: string,
  memberId: string,
  input: TeamMemberUpdateRequest,
  request: Request,
) {
  await requireTeamUser(request);
  await assertTeamExists(teamId);
  await assertTeamMemberExists(teamId, memberId);

  const member = await auditAction(auditTrailActions.teamMemberUpdated, () =>
    prisma.teamMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: input.role,
        isPrimary: input.isPrimary,
      },
      include: {
        user: {
          select: teamMemberUserSelect,
        },
      },
    }),
  );

  return {
    member: toTeamMemberItem(member),
  };
}

export async function removeTeamMemberService(
  teamId: string,
  memberId: string,
  request: Request,
) {
  await requireTeamUser(request);
  await assertTeamExists(teamId);
  await assertTeamMemberExists(teamId, memberId);

  await auditAction(auditTrailActions.teamMemberRemoved, () =>
    prisma.teamMember.delete({
      where: {
        id: memberId,
      },
    }),
  );

  return {
    ok: true,
  };
}

async function requireTeamUser(request: Request) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}

async function assertTeamExists(teamId: string) {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
    },
  });

  if (!team) {
    throw new ApiError("Team not found.", 404);
  }
}

async function assertUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new ApiError("User not found.", 404);
  }
}

async function assertTeamMemberExists(teamId: string, memberId: string) {
  const member = await prisma.teamMember.findFirst({
    where: {
      id: memberId,
      teamId,
    },
    select: {
      id: true,
    },
  });

  if (!member) {
    throw new ApiError("Team member not found.", 404);
  }
}

async function assertTeamCodeAvailable(code: string, teamId?: string) {
  const team = await prisma.team.findUnique({
    where: {
      code,
    },
    select: {
      id: true,
    },
  });

  if (team && team.id !== teamId) {
    throw new ApiError("Team code is already used.", 409);
  }
}

const teamMemberUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
} as const;

function toTeamItem(team: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    members: number;
  };
}): TeamItem {
  return {
    id: team.id,
    name: team.name,
    code: team.code,
    description: team.description,
    status: team.status,
    memberCount: team._count.members,
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

function toTeamMemberItem(member: {
  id: string;
  teamId: string;
  userId: string;
  role: string;
  isPrimary: boolean;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user: TeamMemberItem["user"];
}): TeamMemberItem {
  return {
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role,
    isPrimary: member.isPrimary,
    joinedAt: member.joinedAt.toISOString(),
    createdAt: member.createdAt.toISOString(),
    updatedAt: member.updatedAt.toISOString(),
    user: member.user,
  };
}
