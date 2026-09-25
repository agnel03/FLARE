import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __flarePrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__flarePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__flarePrisma = prisma;
}

export * from "@prisma/client";
