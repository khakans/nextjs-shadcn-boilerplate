import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { getClientIp } from "@/lib/auth/rate-limit";
import type { Prisma } from "@/lib/generated/prisma/client";

export const auditTrailActions = {
  authSignup: "AUTH_SIGNUP",
  authLogin: "AUTH_LOGIN",
  authLogout: "AUTH_LOGOUT",
  authGoogleLogin: "AUTH_GOOGLE_LOGIN",
  authGoogleLink: "AUTH_GOOGLE_LINK",
  passwordResetRequested: "PASSWORD_RESET_REQUESTED",
  passwordResetCompleted: "PASSWORD_RESET_COMPLETED",
  passwordChanged: "PASSWORD_CHANGED",
  profileUpdated: "PROFILE_UPDATED",
  avatarUpdated: "AVATAR_UPDATED",
  companyCreated: "COMPANY_CREATED",
  companyUpdated: "COMPANY_UPDATED",
  accountDeactivated: "ACCOUNT_DEACTIVATED",
  sessionRevoked: "SESSION_REVOKED",
  otherSessionsRevoked: "OTHER_SESSIONS_REVOKED",
  refreshTokenReused: "REFRESH_TOKEN_REUSED",
  sessionExpired: "SESSION_EXPIRED",
} as const;

export const auditTrailEntities = {
  auth: "Auth",
  passwordResetToken: "PasswordResetToken",
  user: "User",
  userSession: "UserSession",
  company: "Company",
} as const;

export const auditTrailStatuses = {
  success: "SUCCESS",
  failed: "FAILED",
} as const;

type AuditTrailContext = {
  request?: Request;
  requestId?: string | null;
};

type AuditActorContext = {
  actorUserId: string | null;
  targetUserId: string | null;
  userSessionId: string | null;
};

type AuditFrame = {
  action: string;
  actor: AuditActorContext;
  mutations: AuditMutation[];
};

type AuditStore = AuditTrailContext & {
  frames: AuditFrame[];
};

type AuditMutation = {
  model: string;
  operation: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  changedFields: string[];
  metadata: Record<string, unknown> | null;
};

const auditStorage = new AsyncLocalStorage<AuditStore>();
const writeOperations = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

export function runWithAuditRequestContext<T>(
  context: AuditTrailContext,
  callback: () => Promise<T>,
) {
  const existingStore = auditStorage.getStore();

  if (existingStore) {
    return callback();
  }

  return auditStorage.run(
    {
      ...context,
      frames: [],
    },
    callback,
  );
}

export async function auditAction<T>(
  action: string,
  callback: () => Promise<T>,
) {
  const store = auditStorage.getStore();

  if (!store) {
    return callback();
  }

  const frame: AuditFrame = {
    action,
    actor: await resolveAuditActorContext(store),
    mutations: [],
  };

  store.frames.push(frame);

  try {
    const result = await callback();
    store.frames.pop();
    await writeAuditFrame(store, frame, auditTrailStatuses.success);

    return result;
  } catch (error) {
    store.frames.pop();
    await writeAuditFrame(store, frame, auditTrailStatuses.failed, error);
    throw error;
  }
}

export async function interceptPrismaOperation<TArgs, TResult>({
  model,
  operation,
  args,
  query,
}: {
  model?: string;
  operation: string;
  args: TArgs;
  query: (args: TArgs) => Promise<TResult>;
}) {
  const frame = getActiveAuditFrame();

  if (
    !frame ||
    !model ||
    model === "AuditTrail" ||
    !writeOperations.has(operation)
  ) {
    return query(args);
  }

  const beforeRecords = await readBeforeRecords(model, operation, args);
  const result = await query(args);
  const afterRecords = await readAfterRecords(
    model,
    operation,
    args,
    result,
    beforeRecords,
  );
  const mutations = buildAuditMutations({
    model,
    operation,
    beforeRecords,
    afterRecords,
    result,
  });

  frame.mutations.push(...mutations);

  return result;
}

export function buildAuditTrailContext(request?: Request): {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
} {
  if (!request) {
    return {};
  }

  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get("user-agent"),
    requestId:
      request.headers.get("x-request-id") ??
      request.headers.get("x-correlation-id"),
  };
}

function getActiveAuditFrame() {
  const store = auditStorage.getStore();

  return store?.frames.at(-1) ?? null;
}

async function resolveAuditActorContext(
  store: AuditStore,
): Promise<AuditActorContext> {
  if (!store.request) {
    return {
      actorUserId: null,
      targetUserId: null,
      userSessionId: null,
    };
  }

  const [{ getCurrentUserFromRequest }, { getCurrentUserSessionIdFromRequest }] =
    await Promise.all([
      import("@/lib/auth"),
      import("@/lib/auth/session"),
    ]);
  const user = await getCurrentUserFromRequest(store.request);
  const userSessionId = user
    ? await getCurrentUserSessionIdFromRequest(store.request, user.id)
    : null;

  return {
    actorUserId: user?.id ?? null,
    targetUserId: user?.id ?? null,
    userSessionId,
  };
}

async function readBeforeRecords(
  model: string,
  operation: string,
  args: unknown,
) {
  if (!needsBeforeSnapshot(operation)) {
    return [];
  }

  return findMany(model, getWhere(args));
}

async function readAfterRecords(
  model: string,
  operation: string,
  args: unknown,
  result: unknown,
  beforeRecords: Record<string, unknown>[],
) {
  if (operation === "delete" || operation === "deleteMany") {
    return [];
  }

  if (operation === "create") {
    const id = getEntityId(result);

    return id ? findMany(model, { id }) : normalizeRecords(result);
  }

  if (operation === "createMany" || operation === "createManyAndReturn") {
    return normalizeRecords(result);
  }

  if (operation === "update" || operation === "upsert") {
    const id = getEntityId(result);

    return id ? findMany(model, { id }) : normalizeRecords(result);
  }

  if (operation === "updateMany" || operation === "updateManyAndReturn") {
    const ids = beforeRecords.map(getEntityId).filter(Boolean);

    if (ids.length === 0) {
      return normalizeRecords(result);
    }

    return findMany(model, {
      id: {
        in: ids,
      },
    });
  }

  return normalizeRecords(result);
}

function buildAuditMutations({
  model,
  operation,
  beforeRecords,
  afterRecords,
  result,
}: {
  model: string;
  operation: string;
  beforeRecords: Record<string, unknown>[];
  afterRecords: Record<string, unknown>[];
  result: unknown;
}) {
  if (
    (operation === "createMany" || operation === "deleteMany") &&
    beforeRecords.length === 0 &&
    afterRecords.length === 0
  ) {
    return [
      {
        model,
        operation,
        entityType: model,
        entityId: null,
        before: null,
        after: null,
        changedFields: [],
        metadata: getBulkMetadata(result),
      },
    ] satisfies AuditMutation[];
  }

  const beforeById = mapRecordsById(beforeRecords);
  const afterById = mapRecordsById(afterRecords);
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);

  return [...ids].map((id) => {
    const before = beforeById.get(id) ?? null;
    const after = afterById.get(id) ?? null;

    return {
      model,
      operation,
      entityType: model,
      entityId: id,
      before,
      after,
      changedFields: diffAuditValues(
        normalizeAuditRecord(before),
        normalizeAuditRecord(after),
      ),
      metadata: buildMutationMetadata(model, before, after, result),
    } satisfies AuditMutation;
  });
}

async function writeAuditFrame(
  store: AuditStore,
  frame: AuditFrame,
  status: string,
  error?: unknown,
) {
  const { prisma } = await import("@/lib/prisma");
  const requestContext = buildAuditTrailContext(store.request);
  const mutationTargets = frame.mutations.length > 0 ? frame.mutations : [null];

  for (const mutation of mutationTargets) {
    const targetUserId = inferTargetUserId(frame, mutation);

    await prisma.auditTrail.create({
      data: {
        actorUserId: frame.actor.actorUserId,
        targetUserId,
        userSessionId: frame.actor.userSessionId,
        action: frame.action,
        entityType: mutation?.entityType ?? auditTrailEntities.auth,
        entityId: mutation?.entityId ?? null,
        status,
        before:
          mutation?.before === undefined
            ? undefined
            : toAuditJson(mutation?.before),
        after:
          mutation?.after === undefined
            ? undefined
            : toAuditJson(mutation?.after),
        changedFields: mutation?.changedFields ?? [],
        metadata: toAuditJson({
          ...(mutation?.metadata ?? {}),
          ...(error ? { error: serializeAuditError(error) } : {}),
        }),
        ipAddress: requestContext.ipAddress ?? null,
        userAgent: requestContext.userAgent ?? null,
        requestId: store.requestId ?? requestContext.requestId ?? null,
      },
    });
  }
}

async function findMany(model: string, where: unknown) {
  if (!where || typeof where !== "object") {
    return [];
  }

  const { prisma } = await import("@/lib/prisma");
  const delegate = getModelDelegate(prisma, model);

  if (!delegate?.findMany) {
    return [];
  }

  return normalizeRecords(
    await delegate.findMany({
      where,
    }),
  );
}

function getModelDelegate(
  prismaClient: unknown,
  model: string,
): { findMany?: (args: unknown) => Promise<unknown> } | null {
  if (!prismaClient || typeof prismaClient !== "object") {
    return null;
  }

  const delegateName = model[0]?.toLowerCase() + model.slice(1);
  const delegate = (prismaClient as Record<string, unknown>)[delegateName];

  if (!delegate || typeof delegate !== "object") {
    return null;
  }

  return delegate as { findMany?: (args: unknown) => Promise<unknown> };
}

function getWhere(args: unknown) {
  if (!args || typeof args !== "object" || !("where" in args)) {
    return {};
  }

  return (args as { where?: unknown }).where ?? {};
}

function normalizeRecords(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  return isRecord(value) ? [value] : [];
}

function mapRecordsById(records: Record<string, unknown>[]) {
  return new Map(
    records
      .map((record) => [getEntityId(record), record] as const)
      .filter((entry): entry is readonly [string, Record<string, unknown>] =>
        Boolean(entry[0]),
      ),
  );
}

function getEntityId(value: unknown) {
  if (!value || typeof value !== "object" || !("id" in value)) {
    return null;
  }

  const id = (value as { id?: unknown }).id;

  return typeof id === "string" ? id : null;
}

function inferTargetUserId(frame: AuditFrame, mutation: AuditMutation | null) {
  if (frame.actor.targetUserId) {
    return frame.actor.targetUserId;
  }

  if (!mutation) {
    return null;
  }

  if (mutation.entityType === "User") {
    return mutation.entityId;
  }

  const before = normalizeAuditRecord(mutation.before);
  const after = normalizeAuditRecord(mutation.after);
  const userId = after.userId ?? before.userId;

  return typeof userId === "string" ? userId : null;
}

function buildMutationMetadata(
  model: string,
  before: unknown,
  after: unknown,
  result: unknown,
) {
  const beforeRecord = normalizeAuditRecord(before);
  const afterRecord = normalizeAuditRecord(after);

  return {
    model,
    ...(beforeRecord.sessionId || afterRecord.sessionId
      ? {
          sessionId: afterRecord.sessionId ?? beforeRecord.sessionId,
        }
      : {}),
    ...getBulkMetadata(result),
  };
}

function getBulkMetadata(result: unknown) {
  if (!result || typeof result !== "object" || !("count" in result)) {
    return {};
  }

  const count = (result as { count?: unknown }).count;

  return typeof count === "number" ? { count } : {};
}

function needsBeforeSnapshot(operation: string) {
  return (
    operation === "update" ||
    operation === "updateMany" ||
    operation === "updateManyAndReturn" ||
    operation === "upsert" ||
    operation === "delete" ||
    operation === "deleteMany"
  );
}

export function diffAuditValues(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...fields].filter(
    (field) =>
      JSON.stringify(toAuditJson(before[field])) !==
      JSON.stringify(toAuditJson(after[field])),
  );
}

export function pickAuditFields<T extends Record<string, unknown>>(
  value: T,
  fields: Array<keyof T>,
) {
  return Object.fromEntries(
    fields.map((field) => [field, value[field] ?? null]),
  );
}

function normalizeAuditRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function toAuditJson(value: unknown): Prisma.InputJsonValue {
  return sanitizeAuditValue(value, new WeakSet()) as Prisma.InputJsonValue;
}

function sanitizeAuditValue(
  value: unknown,
  seen: WeakSet<object>,
): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item, seen));
  }

  if (!value || typeof value !== "object") {
    return value ?? null;
  }

  if (seen.has(value)) {
    return "[Circular]";
  }

  seen.add(value);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      shouldRedactAuditKey(key)
        ? "[Redacted]"
        : sanitizeAuditValue(entry, seen),
    ]),
  );
}

function sanitizeString(value: string) {
  if (value.startsWith("data:image/")) {
    return "[Image data omitted]";
  }

  if (value.length > 500) {
    return `[Long string omitted: ${value.length} chars]`;
  }

  return value;
}

function serializeAuditError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return String(error);
}

function shouldRedactAuditKey(key: string) {
  const normalizedKey = key.toLowerCase();

  return [
    "authorization",
    "cookie",
    "csrf",
    "jwt",
    "password",
    "secret",
    "token",
  ].some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
