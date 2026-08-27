import {z} from "zod";
import {auth} from "@/auth";
import {prisma} from "@/lib/prisma";
import {findPaddlePrice} from "@/lib/payments/paddle";

const schema=z.object({productId:z.string().uuid(),attribution:z.record(z.string(),z.string().max(200)).optional()});

export async function POST(request:Request){
 const session=await auth();if(!session?.user||session.user.role!=="STUDENT")return Response.json({error:"Unauthorized"},{status:401});if(!session.user.email)return Response.json({error:"Your account needs an email address before checkout"},{status:400});
 const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid product"},{status:400});
 const products=await prisma.$queryRaw<Array<{id:string;name:string;price_in_paise:number;currency:string;paddle_product_id:string|null}>>`select id,name,price_in_paise,currency,metadata->>'paddle_product_id' paddle_product_id from public.products where id=${parsed.data.productId}::uuid and active=true`;
 const product=products[0];if(!product)return Response.json({error:"Product is unavailable"},{status:404});if(!product.paddle_product_id)return Response.json({error:"Paddle checkout is not available for this product yet"},{status:503});
 const owned=await prisma.$queryRaw<Array<{owned:boolean}>>`select exists(select 1 from public.entitlements where user_id=${session.user.id}::uuid and product_id=${product.id}::uuid and status='active' and (expires_at is null or expires_at>now())) owned`;
 if(owned[0]?.owned)return Response.json({error:"You already own this product.",alreadyOwned:true},{status:409});
 let priceId:string;try{priceId=await findPaddlePrice({paddleProductId:product.paddle_product_id,amountInPaise:product.price_in_paise,currency:product.currency});}catch(error){console.error("Paddle price lookup failed",error);return Response.json({error:"Paddle payments are not configured for this product"},{status:503});}
 const reference=`TAKSH-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
 await prisma.$transaction(async tx=>{
  await tx.$executeRaw`insert into public.payment_orders(user_id,product_id,internal_order_reference,provider,amount_in_paise,currency,status,attribution_json) values(${session.user.id}::uuid,${product.id}::uuid,${reference},'paddle',${product.price_in_paise},${product.currency},'created',${JSON.stringify(parsed.data.attribution||{})}::jsonb)`;
  await tx.$executeRaw`insert into public.product_events(user_id,event_name,product_id,properties) values(${session.user.id}::uuid,'checkout_started',${product.id}::uuid,${JSON.stringify({...parsed.data.attribution,provider:"paddle"})}::jsonb)`;
 });
 const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(request.url).origin;
 return Response.json({priceId,reference,email:session.user.email,successUrl:`${origin}/payment-success?reference=${encodeURIComponent(reference)}`,customData:{taksh_order_reference:reference,taksh_product_id:product.id,taksh_user_id:session.user.id}});
}
