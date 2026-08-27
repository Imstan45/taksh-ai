import type {Prisma} from "@/generated/prisma/client";

export async function grantProductEntitlement(tx:Prisma.TransactionClient,input:{userId:string;productId:string;paymentId:string;source:string}){
  await tx.$executeRaw`insert into public.entitlements(user_id,product_id,payment_id,starts_at,expires_at,status,grant_source)
    values(${input.userId}::uuid,${input.productId}::uuid,${input.paymentId}::uuid,now(),null,'active',${input.source})
    on conflict(payment_id) do nothing`;
}
