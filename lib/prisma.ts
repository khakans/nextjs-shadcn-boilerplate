import { PrismaPg } from "@prisma/adapter-pg";

import { interceptPrismaOperation } from "@/lib/audit-trail";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

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
          return interceptPrismaOperation({
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
