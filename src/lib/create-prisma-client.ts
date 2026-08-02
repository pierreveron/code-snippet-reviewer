import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";

/** Shared factory for Next.js (`db.ts`) and CLI scripts (no `server-only`). */
export function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

  return new PrismaClient({ adapter });
}
