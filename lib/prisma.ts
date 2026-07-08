import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

type PrismaOperationInput<TArgs, TResult> = {
  model?: string;
  operation: string;
  args: TArgs;
  query: (args: TArgs) => Promise<TResult>;
};

type PrismaOperationInterceptor = typeof import("@/lib/audit-trail")["interceptPrismaOperation"];

let auditTrailInterceptorPromise: Promise<PrismaOperationInterceptor> | null =
  null;

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  return new PrismaClient({
    adapter: new PrismaPg(url),
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          return runPrismaOperation({
            model,
            operation,
            args,
            query,
          });
        },
      },
    },
  }) as unknown as PrismaClient;
}

async function runPrismaOperation<TArgs, TResult>(
  input: PrismaOperationInput<TArgs, TResult>,
) {
  if (isJobsWorkerProcess()) {
    return input.query(input.args);
  }

  const interceptPrismaOperation = await getAuditTrailInterceptor();

  return interceptPrismaOperation(input);
}

function getAuditTrailInterceptor() {
  auditTrailInterceptorPromise ??= import("@/lib/audit-trail").then(
    (module) => module.interceptPrismaOperation,
  );

  return auditTrailInterceptorPromise;
}

function isJobsWorkerProcess() {
  if (process.env.JOB_WORKER === "true") {
    return true;
  }

  const entrypoint = process.argv[1]?.replaceAll("\\", "/") ?? "";

  return (
    entrypoint.endsWith("/workers/jobs-worker.ts") ||
    entrypoint.endsWith("/workers/jobs-worker.js")
  );
}
