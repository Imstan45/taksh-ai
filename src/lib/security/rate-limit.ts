import { prisma } from "@/lib/prisma";
import { hashToken } from "./tokens";

export async function enforceRateLimit(scope: string, identifier: string, limit: number, windowMs: number) {
  const key = hashToken(`${scope}:${identifier}`);
  const now = new Date();
  const existing = await prisma.rateLimitEntry.findUnique({ where: { key } });
  if (!existing || existing.windowEnds <= now) {
    await prisma.rateLimitEntry.upsert({
      where: { key },
      create: { key, windowEnds: new Date(now.getTime() + windowMs) },
      update: { count: 1, windowEnds: new Date(now.getTime() + windowMs) },
    });
    return;
  }
  if (existing.count >= limit) throw new Error("RATE_LIMITED");
  await prisma.rateLimitEntry.update({ where: { key }, data: { count: { increment: 1 } } });
}
