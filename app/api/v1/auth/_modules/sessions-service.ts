import { ApiError } from "@/lib/api-response";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth";
import {
  getCurrentUserSessionId,
  getCurrentUserSessionIdFromRequest,
} from "@/lib/auth/session";
import { auditAction, auditTrailActions } from "@/lib/audit-trail";
import type { PaginationMeta } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export type UserSessionItem = {
  id: string;
  sessionId: string;
  browser: string | null;
  operatingSystem: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  loginAt: string;
  lastActiveAt: string;
  logoutAt: string | null;
  expiredAt: string;
  status: "ONLINE" | "LOGGED_OUT" | "EXPIRED" | "REVOKED";
  isCurrent: boolean;
};

export type UserSessionsQuery = {
  page: number;
  pageSize: number;
};

export type UserSessionsResult = {
  sessions: UserSessionItem[];
  pagination: PaginationMeta;
};

export async function listUserSessionsService(
  query: UserSessionsQuery,
  request?: Request,
): Promise<UserSessionsResult> {
  const user = await requireSessionUser(request);
  const currentSessionId = request
    ? await getCurrentUserSessionIdFromRequest(request, user.id)
    : await getCurrentUserSessionId(user.id);

  await expireOldUserSessions(user.id);

  const where = {
    userId: user.id,
    status: "ONLINE" as const,
    expiredAt: {
      gt: new Date(),
    },
  };
  const [totalCount, sessions] = await Promise.all([
    prisma.userSession.count({
      where,
    }),
    prisma.userSession.findMany({
      where,
      orderBy: [
        {
          lastActiveAt: "desc",
        },
        {
          loginAt: "desc",
        },
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        sessionId: true,
        browser: true,
        operatingSystem: true,
        deviceName: true,
        ipAddress: true,
        loginAt: true,
        lastActiveAt: true,
        logoutAt: true,
        expiredAt: true,
        status: true,
      },
    }),
  ]);
  const totalPages = Math.ceil(totalCount / query.pageSize);

  return {
    sessions: sessions.map((session) => ({
      id: session.id,
      sessionId: session.sessionId,
      browser: session.browser,
      operatingSystem: session.operatingSystem,
      deviceName: session.deviceName,
      ipAddress: session.ipAddress,
      loginAt: session.loginAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      logoutAt: session.logoutAt?.toISOString() ?? null,
      expiredAt: session.expiredAt.toISOString(),
      status: session.status,
      isCurrent: session.id === currentSessionId,
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages,
    },
  };
}

export function parseUserSessionsQuery(request: Request): UserSessionsQuery {
  const url = new URL(request.url);

  return {
    page: parsePage(url.searchParams.get("page")),
    pageSize: parsePageSize(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit"),
    ),
  };
}

function parsePage(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(Math.trunc(parsed), 1);
}

function parsePageSize(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(Math.max(Math.trunc(parsed), 1), 50);
}

export async function revokeUserSessionService(
  sessionId: string,
  request?: Request,
) {
  const user = await requireSessionUser(request);
  const currentSessionId = request
    ? await getCurrentUserSessionIdFromRequest(request, user.id)
    : await getCurrentUserSessionId(user.id);
  const session = await prisma.userSession.findFirst({
    where: {
      userId: user.id,
      sessionId,
      status: "ONLINE",
    },
    select: {
      id: true,
    },
  });

  if (!session) {
    throw new ApiError("Session not found.", 404);
  }

  if (session.id === currentSessionId) {
    throw new ApiError("Use logout to end the current session.", 400);
  }

  await auditAction(auditTrailActions.sessionRevoked, () =>
    revokeSessionsByIds([session.id], "REVOKED"),
  );
}

export async function logoutOtherUserSessionsService(request?: Request) {
  const user = await requireSessionUser(request);
  const currentSessionId = request
    ? await getCurrentUserSessionIdFromRequest(request, user.id)
    : await getCurrentUserSessionId(user.id);

  if (!currentSessionId) {
    throw new ApiError("Current session not found.", 400);
  }

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: user.id,
      status: "ONLINE",
      id: {
        not: currentSessionId,
      },
    },
    select: {
      id: true,
    },
  });

  await auditAction(
    auditTrailActions.otherSessionsRevoked,
    () =>
      revokeSessionsByIds(
        sessions.map((session) => session.id),
        "REVOKED",
      ),
  );
}

async function expireOldUserSessions(userId: string) {
  const now = new Date();

  await prisma.userSession.updateMany({
    where: {
      userId,
      status: "ONLINE",
      expiredAt: {
        lte: now,
      },
    },
    data: {
      status: "EXPIRED",
      logoutAt: now,
    },
  });
}

async function requireSessionUser(request?: Request) {
  const user = request
    ? await getCurrentUserFromRequest(request)
    : await getCurrentUser();

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  return user;
}

async function revokeSessionsByIds(
  sessionIds: string[],
  status: "LOGGED_OUT" | "REVOKED",
) {
  if (sessionIds.length === 0) {
    return;
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: {
        id: {
          in: sessionIds,
        },
        status: "ONLINE",
      },
      data: {
        status,
        logoutAt: now,
        lastActiveAt: now,
      },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userSessionId: {
          in: sessionIds,
        },
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        lastUsedAt: now,
      },
    }),
  ]);
}
