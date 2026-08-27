import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifySupport } from "@/lib/support-email";

const requestSchema = z.object({
  category: z.enum(["account","payment","course","assessment","institution","technical","other"]),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(3000),
});

function ticketNumber() {
  return `TAK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return Response.json({ error: "Please sign in to contact support." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Please complete the subject and message." }, { status: 400 });

  const reference = ticketNumber();
  const name = session.user.name ?? session.user.email.split("@")[0];
  const rows = await prisma.$queryRaw<Array<{id:string}>>`
    insert into public.support_tickets(ticket_number,user_id,requester_name,requester_email,requester_role,category,subject,message)
    values(${reference},${session.user.id}::uuid,${name},${session.user.email},${session.user.role},${parsed.data.category},${parsed.data.subject},${parsed.data.message})
    returning id
  `;
  let emailed = false;
  try {
    emailed = await notifySupport({ ticketNumber: reference, name, email: session.user.email, role: session.user.role, ...parsed.data });
    if (emailed) await prisma.$executeRaw`update public.support_tickets set email_notified=true,updated_at=now() where id=${rows[0].id}::uuid`;
  } catch { /* The saved ticket remains available to Super Admin. */ }
  return Response.json({ ticketNumber: reference, emailed }, { status: 201 });
}
