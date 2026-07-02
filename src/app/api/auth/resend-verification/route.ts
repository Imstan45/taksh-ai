import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { emailSchema } from "@/lib/auth/validation";
import { createToken, hashToken } from "@/lib/security/tokens";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const parsed = await parseJson(request, emailSchema);
  if (!parsed.data) return parsed.error;
  try {
    await enforceRateLimit("resend", parsed.data.email, 3, 60 * 60_000);
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user && !user.emailVerified) {
      const token = createToken();
      await prisma.$transaction([
        prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
        prisma.verificationToken.create({ data: { identifier: user.email, token: hashToken(token), expires: new Date(Date.now() + 24 * 60 * 60_000) } }),
      ]);
      await sendVerificationEmail(user.email, token);
    }
    return NextResponse.json({ message: "If an unverified account exists, a new link has been sent." });
  } catch (error) { return authError(error); }
}
