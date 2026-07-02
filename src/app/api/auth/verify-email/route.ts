import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseJson, authError } from "@/lib/auth/api";
import { tokenSchema } from "@/lib/auth/validation";
import { hashToken } from "@/lib/security/tokens";

export async function POST(request: Request) {
  const parsed = await parseJson(request, tokenSchema);
  if (!parsed.data) return parsed.error;
  try {
    const tokenHash = hashToken(parsed.data.token);
    const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
    if (!record || record.expires < new Date())
      return NextResponse.json({ error: "This verification link is invalid or expired" }, { status: 400 });
    await prisma.$transaction([
      prisma.user.update({ where: { email: record.identifier }, data: { emailVerified: new Date() } }),
      prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
      prisma.auditLog.create({ data: { action: "EMAIL_VERIFIED", metadata: { email: record.identifier } } }),
    ]);
    return NextResponse.json({ message: "Email verified. You can now sign in." });
  } catch (error) { return authError(error); }
}
