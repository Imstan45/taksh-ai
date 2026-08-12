"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
export async function markAllNotificationsRead(){const session=await auth();if(!session?.user)throw new Error("Unauthorized");await prisma.$executeRaw`UPDATE public.notifications SET read_at=coalesce(read_at,now()) WHERE user_id=${session.user.id}::uuid`;revalidatePath("/notifications");}
