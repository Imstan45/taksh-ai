import {z} from "zod";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {dodoClient,dodoProductId} from "@/lib/payments/dodo";
import {currentSalesAttribution} from "@/lib/sales-challenge/attribution";

const schema=z.object({productId:z.string().uuid(),attribution:z.record(z.string(),z.string().max(200)).optional()});

export async function POST(request:Request){
 const session=await auth();if(!session?.user||session.user.role!=="STUDENT")return Response.json({error:"Unauthorized"},{status:401});if(!session.user.email)return Response.json({error:"Your account needs an email address before checkout"},{status:400});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid product"},{status:400});
 const products=await prisma.$queryRaw<Array<{id:string;name:string;price_in_paise:number;currency:string;product_type:"course"|"bundle"}>>`select id,name,price_in_paise,currency,product_type from public.products where id=${parsed.data.productId}::uuid and active=true`;
 const product=products[0];if(!product)return Response.json({error:"Product is unavailable"},{status:404});
 const owned=await prisma.$queryRaw<Array<{owned:boolean}>>`select exists(select 1 from public.entitlements where user_id=${session.user.id}::uuid and product_id=${product.id}::uuid and status='active' and (expires_at is null or expires_at>now())) owned`;
 if(owned[0]?.owned)return Response.json({error:"You already own this product.",alreadyOwned:true},{status:409});
 let client;try{client=dodoClient()}catch{return Response.json({error:"Payments are not configured"},{status:503})}
 const reference=`TAKSH-${Date.now()}-${crypto.randomUUID().slice(0,8)}`,providerProductId=dodoProductId(product.product_type),salesAttribution=await currentSalesAttribution(session.user.id);
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`insert into public.payment_orders(user_id,product_id,internal_order_reference,provider,amount_in_paise,currency,status,attribution_json,sales_attribution_id) values(${session.user.id}::uuid,${product.id}::uuid,${reference},'dodo',${product.price_in_paise},${product.currency},'pending',${JSON.stringify(parsed.data.attribution||{})}::jsonb,${salesAttribution}::uuid)`;
  await tx.$executeRaw`insert into public.product_events(user_id,event_name,product_id,properties) values(${session.user.id}::uuid,'checkout_started',${product.id}::uuid,${JSON.stringify({...parsed.data.attribution,provider:"dodo"})}::jsonb)`;
 });
 try{
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
  const checkout=await client.checkoutSessions.create({product_cart:[{product_id:providerProductId,quantity:1}],customer:{email:session.user.email,name:session.user.name||undefined},metadata:{taksh_order_reference:reference,taksh_product_id:product.id,taksh_user_id:session.user.id},return_url:`${origin}/payment-success?reference=${encodeURIComponent(reference)}`,cancel_url:`${origin}/checkout?product=${product.id}`});
  if(!checkout.checkout_url)throw new Error("Dodo did not return a checkout URL");
  await prisma.$executeRaw`update public.payment_orders set provider_order_id=${checkout.session_id},status='created',updated_at=now() where internal_order_reference=${reference}`;
  return Response.json({checkoutUrl:checkout.checkout_url,reference});
 }catch(error){await prisma.$executeRaw`update public.payment_orders set status='failed',updated_at=now() where internal_order_reference=${reference}`;return Response.json({error:error instanceof Error?error.message:"Unable to start payment"},{status:502});}
}
