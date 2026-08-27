import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({error:"Unauthorized"},{status:401});
  const entitlements = await prisma.$queryRaw<Array<{starts_at:Date;expires_at:Date|null;status:string;code:string;name:string;grant_source:string}>>`
    select entitlement.starts_at,entitlement.expires_at,entitlement.status,product.code,product.name,entitlement.grant_source
    from public.entitlements entitlement join public.products product on product.id=entitlement.product_id
    where entitlement.user_id=${session.user.id}::uuid and entitlement.status='active'
      and entitlement.starts_at<=now() and (entitlement.expires_at is null or entitlement.expires_at>now())
    order by entitlement.starts_at desc`;
  return Response.json({premium:entitlements.length>0,entitlements});
}
