import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { registerSchema } from "@/lib/auth/validation";
import { createToken, hashToken } from "@/lib/security/tokens";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { requestFingerprint } from "@/lib/security/request";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const parsed = await parseJson(request, registerSchema);
  if (!parsed.data) return parsed.error;
  try {
    const ipHash = await requestFingerprint();
    await enforceRateLimit("register", ipHash, 5, 60 * 60_000);
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    const token = createToken();
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hash(parsed.data.password, 12) },
      });
      await tx.verificationToken.create({
        data: { identifier: created.email, token: hashToken(token), expires: new Date(Date.now() + 24 * 60 * 60_000) },
      });
      await tx.auditLog.create({ data: { userId: created.id, action: "USER_REGISTERED", ipHash } });
      return created;
    });
    await sendVerificationEmail(user.email, token);
    return NextResponse.json({ message: "Check your email to verify your account" }, { status: 201 });
  } catch (error) { return authError(error); }
}
