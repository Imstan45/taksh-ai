import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/security/tokens";
import { invitationDestination, invitationIsAcceptable } from "@/lib/invitations";

const schema = z.object({ invitationId: z.string().uuid(), invitationToken: z.string().min(32) });

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Invitation session is missing." }, { status: 401 });
  const { data, error } = await createSupabaseAdminClient().auth.getUser(token);
  if (error || !data.user?.email) return Response.json({ error: "Invitation session is invalid." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid invitation." }, { status: 400 });
  const invitations = await prisma.$queryRaw<Array<{ id: string; email: string; role: "STUDENT" | "FACULTY" | "COLLEGE_ADMIN"; institution_id: string; expires_at: Date; status: string }>>`
    SELECT id, email, role::text, institution_id, expires_at, status
    FROM public.invitations
    WHERE id = ${parsed.data.invitationId}::uuid
      AND token_hash = ${hashToken(parsed.data.invitationToken)}
  `;
  const invitation = invitations[0];
  if (!invitation || !invitationIsAcceptable(invitation.status, invitation.expires_at)) {
    return Response.json({ error: "Invitation is expired or no longer available." }, { status: 410 });
  }
  if (invitation.email.toLowerCase() !== data.user.email.toLowerCase()) {
    return Response.json({ error: "This invitation belongs to another email address." }, { status: 403 });
  }
  const accepted = await prisma.$transaction(async (tx) => {
    const changed = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE public.invitations SET status = 'accepted', accepted_by = ${data.user.id}::uuid,
        accepted_at = now(), updated_at = now()
      WHERE id = ${invitation.id}::uuid AND status = 'pending' AND expires_at > now()
      RETURNING id
    `;
    if (!changed[0]) return false;
    await tx.$executeRaw`
      UPDATE public.user_roles SET role = ${invitation.role}::public.app_role,
        institution_id = ${invitation.institution_id}::uuid, account_status = 'active',
        authorization_version = authorization_version + 1, updated_at = now()
      WHERE user_id = ${data.user.id}::uuid
    `;
    await tx.$executeRaw`INSERT INTO public.audit_logs (actor_id, action, target_type, target_id) VALUES (${data.user.id}::uuid, 'invitation.accepted', 'invitation', ${invitation.id})`;
    return true;
  });
  if (!accepted) return Response.json({ error: "Invitation was already used." }, { status: 409 });
  return Response.json({ ok: true, destination: invitationDestination(invitation.role) });
}
