import { ApiError } from "@/lib/api-response";
import { getCurrentUserFromRequest } from "@/lib/auth";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { PaginationMeta } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

import type { AuditTrailQuery } from "./request";

export type AuditTrailItem = {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  userSessionId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  status: string;
  before: unknown;
  after: unknown;
  changedFields: string[];
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
};

export type AuditTrailUserDetail = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
};

export type AuditTrailSessionDetail = {
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
  status: string;
};

export type AuditTrailDetailItem = AuditTrailItem & {
  actorUser: AuditTrailUserDetail | null;
  targetUser: AuditTrailUserDetail | null;
  session: AuditTrailSessionDetail | null;
  request: {
    ipAddress: string | null;
    requestId: string | null;
    userAgent: string | null;
  };
};

export async function listAuditTrailsService(
  query: AuditTrailQuery,
  request: Request,
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  const where: Prisma.AuditTrailWhereInput = {
    OR: [
      {
        actorUserId: user.id,
      },
      {
        targetUserId: user.id,
      },
    ],
    ...(query.action
      ? {
          action: query.action,
        }
      : {}),
    ...(query.entityType
      ? {
          entityType: query.entityType,
        }
      : {}),
    ...(query.status
      ? {
          status: query.status,
        }
      : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          createdAt: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };
  const [totalCount, auditTrails] = await Promise.all([
    prisma.auditTrail.count({
      where,
    }),
    prisma.auditTrail.findMany({
      where,
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          id: "desc",
        },
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  const totalPages = Math.ceil(totalCount / query.pageSize);

  return {
    auditTrails: auditTrails.map(toAuditTrailItem),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages,
    } satisfies PaginationMeta,
  };
}

export async function getAuditTrailDetailService(
  auditTrailId: string,
  request: Request,
) {
  const user = await getCurrentUserFromRequest(request);

  if (!user) {
    throw new ApiError("Unauthorized.", 401);
  }

  const auditTrail = await prisma.auditTrail.findFirst({
    where: {
      id: auditTrailId,
      OR: [
        {
          actorUserId: user.id,
        },
        {
          targetUserId: user.id,
        },
      ],
    },
    include: {
      actorUser: {
        select: auditTrailUserSelect,
      },
      targetUser: {
        select: auditTrailUserSelect,
      },
    },
  });

  if (!auditTrail) {
    throw new ApiError("Audit log not found.", 404);
  }

  const session = auditTrail.userSessionId
    ? await prisma.userSession.findUnique({
        where: {
          id: auditTrail.userSessionId,
        },
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
      })
    : null;

  return {
    auditTrail: {
      ...toAuditTrailItem(auditTrail),
      actorUser: auditTrail.actorUser,
      targetUser: auditTrail.targetUser,
      session: session
        ? {
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
          }
        : null,
      request: {
        ipAddress: auditTrail.ipAddress,
        requestId: auditTrail.requestId,
        userAgent: auditTrail.userAgent,
      },
    } satisfies AuditTrailDetailItem,
  };
}

const auditTrailUserSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
} as const;

function toAuditTrailItem(auditTrail: {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  userSessionId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  status: string;
  before: unknown;
  after: unknown;
  changedFields: string[];
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: Date;
}): AuditTrailItem {
  return {
    id: auditTrail.id,
    actorUserId: auditTrail.actorUserId,
    targetUserId: auditTrail.targetUserId,
    userSessionId: auditTrail.userSessionId,
    action: auditTrail.action,
    entityType: auditTrail.entityType,
    entityId: auditTrail.entityId,
    status: auditTrail.status,
    before: auditTrail.before,
    after: auditTrail.after,
    changedFields: auditTrail.changedFields,
    metadata: auditTrail.metadata,
    ipAddress: auditTrail.ipAddress,
    userAgent: auditTrail.userAgent,
    requestId: auditTrail.requestId,
    createdAt: auditTrail.createdAt.toISOString(),
  };
}
