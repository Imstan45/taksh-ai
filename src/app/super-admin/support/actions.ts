"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function setSupportTicketStatus(formData:FormData){
  const session=await auth();if(!session?.user||session.user.role!=="SUPER_ADMIN")throw new Error("Unauthorized");
  const id=String(formData.get("id")??""),status=String(formData.get("status")??"");
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["open","resolved"].includes(status))throw new Error("Invalid ticket update");
  await prisma.$executeRaw`update public.support_tickets set status=${status},resolved_at=case when ${status}='resolved' then now() else null end,updated_at=now() where id=${id}::uuid`;
  revalidatePath("/super-admin/support");
}
