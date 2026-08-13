import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { mainEnvironment } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = mainEnvironment().DATABASE_URL;
  const ssl = connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined;
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, ssl, max: 1 }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
