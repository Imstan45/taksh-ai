import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { resetPasswordSchema } from "@/lib/auth/validation";
import { hashToken } from "@/lib/security/tokens";

export async function POST(request: Request) {
  const parsed = await parseJson(request, resetPasswordSchema);
  if (!parsed.data) return parsed.error;
  try {
    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date())
      return NextResponse.json({ error: "This reset link is invalid or expired" }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { email: record.email }, data: { passwordHash: await hash(parsed.data.password, 12) } }),
      prisma.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } }),
      prisma.session.deleteMany({ where: { user: { email: record.email } } }),
      prisma.auditLog.create({ data: { action: "PASSWORD_RESET", metadata: { email: record.email } } }),
    ]);
    return NextResponse.json({ message: "Password updated. Sign in with your new password." });
  } catch (error) { return authError(error); }
}
