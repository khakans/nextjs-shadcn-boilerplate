import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient as MysqlPrismaClient } from "@/lib/generated/prisma/mysql/client";
import { PrismaClient as PostgresqlPrismaClient } from "@/lib/generated/prisma/postgresql/client";
import { PrismaClient as SqlitePrismaClient } from "@/lib/generated/prisma/sqlite/client";

type DatabaseProvider = "sqlite" | "postgresql" | "mysql";
type AppPrismaClient =
  | SqlitePrismaClient
  | PostgresqlPrismaClient
  | MysqlPrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma?: AppPrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function createPrismaClient(): AppPrismaClient {
  const provider = getDatabaseProvider();
  const url = getDatabaseUrl(provider);

  switch (provider) {
    case "sqlite":
      return new SqlitePrismaClient({
        adapter: new PrismaLibSql({ url }),
      });
    case "postgresql":
      return new PostgresqlPrismaClient({
        adapter: new PrismaPg(url),
      });
    case "mysql":
      return new MysqlPrismaClient({
        adapter: new PrismaMariaDb(url),
      });
  }
}

function getDatabaseProvider(): DatabaseProvider {
  switch (process.env.DATABASE_PROVIDER) {
    case undefined:
    case "":
    case "sqlite":
      return "sqlite";
    case "postgres":
    case "postgresql":
      return "postgresql";
    case "mariadb":
    case "mysql":
      return "mysql";
    default:
      throw new Error(
        `Unsupported DATABASE_PROVIDER "${process.env.DATABASE_PROVIDER}". Use sqlite, postgresql, or mysql.`,
      );
  }
}

function getDatabaseUrl(provider: DatabaseProvider) {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (provider === "sqlite") {
    return "file:./dev.db";
  }

  throw new Error(`DATABASE_URL is required for ${provider}.`);
}
