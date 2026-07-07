import { ApiError } from "@/lib/api-response";
import { getCurrentUser, getCurrentUserFromRequest } from "@/lib/auth";
import {
  getCurrentUserSessionId,
  getCurrentUserSessionIdFromRequest,
} from "@/lib/auth/session";
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

export async function listUserSessionsService(request?: Request) {
  const user = await requireSessionUser(request);
  const currentSessionId = request
    ? await getCurrentUserSessionIdFromRequest(request, user.id)
    : await getCurrentUserSessionId(user.id);

  await expireOldUserSessions(user.id);

  const sessions = await prisma.userSession.findMany({
    where: {
      userId: user.id,
      status: "ONLINE",
      expiredAt: {
        gt: new Date(),
      },
    },
    orderBy: [
      {
        lastActiveAt: "desc",
      },
      {
        loginAt: "desc",
      },
    ],
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
  });

  return sessions.map((session) => ({
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
  })) satisfies UserSessionItem[];
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

  await revokeSessionsByIds([session.id], "REVOKED");
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

  await revokeSessionsByIds(
    sessions.map((session) => session.id),
    "REVOKED",
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
