import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { emailSchema } from "@/lib/auth/validation";
import { createToken, hashToken } from "@/lib/security/tokens";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  const parsed = await parseJson(request, emailSchema);
  if (!parsed.data) return parsed.error;
  try {
    await enforceRateLimit("password-reset", parsed.data.email, 3, 60 * 60_000);
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user?.passwordHash) {
      const token = createToken();
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { email: user.email, usedAt: null } }),
        prisma.passwordResetToken.create({ data: { email: user.email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60_000) } }),
      ]);
      await sendPasswordResetEmail(user.email, token);
    }
    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  } catch (error) { return authError(error); }
}
