import {createHmac,timingSafeEqual} from "node:crypto";
import {recordReferralSale,updateReferralRefund} from "@/lib/referrals/sales";

type PaddlePrice={
 id:string;
 product_id:string;
 status:string;
 billing_cycle:null|unknown;
 unit_price:{amount:string;currency_code:string};
};

export function paddleEnvironment(){
 return process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT==="sandbox"?"sandbox":"production" as const;
}

function paddleApiBase(){return paddleEnvironment()==="sandbox"?"https://sandbox-api.paddle.com":"https://api.paddle.com";}

export function verifyPaddleSignature(raw:string,header:string,secret:string,nowSeconds=Math.floor(Date.now()/1000)){
 const parts=header.split(";").map(value=>value.trim()),timestamp=parts.find(value=>value.startsWith("ts="))?.slice(3),signatures=parts.filter(value=>value.startsWith("h1=")).map(value=>value.slice(3));
 if(!timestamp||!/^\d+$/.test(timestamp)||!signatures.length)return false;
 const eventTime=Number(timestamp);if(!Number.isSafeInteger(eventTime)||Math.abs(nowSeconds-eventTime)>300)return false;
 const expected=createHmac("sha256",secret).update(`${timestamp}:${raw}`).digest("hex"),expectedBytes=Buffer.from(expected,"hex");
 return signatures.some(signature=>{if(!/^[a-f\d]{64}$/i.test(signature))return false;const actual=Buffer.from(signature,"hex");return actual.length===expectedBytes.length&&timingSafeEqual(actual,expectedBytes);});
}

export async function findPaddlePrice(input:{paddleProductId:string;amountInPaise:number;currency:string}){
 const apiKey=process.env.PADDLE_API_KEY;if(!apiKey)throw new Error("Paddle API is not configured");
 const query=new URLSearchParams({product_id:input.paddleProductId,status:"active",per_page:"30"});
 const response=await fetch(`${paddleApiBase()}/prices?${query}`,{headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json"},cache:"no-store"});
 const body=await response.json().catch(()=>null) as {data?:PaddlePrice[];error?:{detail?:string}}|null;
 if(!response.ok)throw new Error(body?.error?.detail||"Paddle price lookup failed");
 const price=body?.data?.find(item=>item.product_id===input.paddleProductId&&item.status==="active"&&item.billing_cycle===null&&item.unit_price.currency_code.toUpperCase()===input.currency.toUpperCase()&&Number(item.unit_price.amount)===input.amountInPaise);
 if(!price)throw new Error("No matching active Paddle price was found");return price.id;
}

export async function activatePaddlePayment(input:{reference:string;transactionId:string;amount:number;currency:string;paddleProductId:string}){
 const {prisma}=await import("@/lib/prisma");
 return prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{id:string;user_id:string;product_id:string;amount_in_paise:number;currency:string;paddle_product_id:string}>>`
   select o.id,o.user_id,o.product_id,o.amount_in_paise,o.currency,p.metadata->>'paddle_product_id' paddle_product_id
   from public.payment_orders o join public.products p on p.id=o.product_id
   where o.internal_order_reference=${input.reference} and o.provider='paddle' for update`;
  const order=rows[0];if(!order)throw new Error("Paddle order not found");
  if(order.amount_in_paise!==input.amount||order.currency.toUpperCase()!==input.currency.toUpperCase())throw new Error("Paddle payment amount mismatch");
  if(order.paddle_product_id!==input.paddleProductId)throw new Error("Paddle payment product mismatch");
  const existing=await tx.$queryRaw<Array<{id:string}>>`select id from public.payments where provider='paddle' and provider_payment_id=${input.transactionId}`;
  if(existing[0])return {duplicate:true};
  const payments=await tx.$queryRaw<Array<{id:string}>>`insert into public.payments(user_id,payment_order_id,provider,provider_payment_id,amount_in_paise,currency,status,verified_at)
   values(${order.user_id}::uuid,${order.id}::uuid,'paddle',${input.transactionId},${order.amount_in_paise},${order.currency},'captured',now()) returning id`;
  await tx.$executeRaw`update public.payment_orders set provider_order_id=${input.transactionId},status='paid',updated_at=now() where id=${order.id}::uuid`;
  await tx.$executeRaw`insert into public.entitlements(user_id,product_id,payment_id,starts_at,expires_at,status,grant_source)
   values(${order.user_id}::uuid,${order.product_id}::uuid,${payments[0].id}::uuid,now(),null,'active','payment')
   on conflict(user_id,product_id) where status='active' and product_id is not null do nothing`;
  await tx.$executeRaw`insert into public.product_events(user_id,event_name,product_id,properties) values(${order.user_id}::uuid,'payment_success',${order.product_id}::uuid,${JSON.stringify({provider:"paddle",transactionId:input.transactionId,amountInPaise:order.amount_in_paise})}::jsonb)`;
  await tx.$executeRaw`update public.campaign_attributions set purchased_at=now(),purchased_product_id=${order.product_id}::uuid,revenue_in_paise=${order.amount_in_paise} where id=(select id from public.campaign_attributions where user_id=${order.user_id}::uuid order by first_touched_at desc limit 1)`;
  await recordReferralSale(tx,{paymentId:payments[0].id,orderId:order.id,provider:"paddle",providerPaymentReference:input.transactionId});
  return {duplicate:false};
 });
}

export async function refundPaddlePayment(transactionId:string,fullRefund:boolean,refundAmount=0){
 const {prisma}=await import("@/lib/prisma");
 await prisma.$transaction(async tx=>{
  const payments=await tx.$queryRaw<Array<{id:string;payment_order_id:string;amount_in_paise:number}>>`select id,payment_order_id,amount_in_paise from public.payments where provider='paddle' and provider_payment_id=${transactionId} for update`;
  const payment=payments[0];if(!payment)return;
  const refunded=fullRefund?payment.amount_in_paise:Math.min(payment.amount_in_paise,Math.max(0,refundAmount));
  await tx.$executeRaw`update public.payments set status=${fullRefund?'refunded':'partially_refunded'},refunded_amount_in_paise=case when ${fullRefund} then amount_in_paise else least(amount_in_paise,refunded_amount_in_paise+${refunded}) end,updated_at=now() where id=${payment.id}::uuid`;
  if(fullRefund){
   await tx.$executeRaw`update public.payment_orders set status='refunded',updated_at=now() where id=${payment.payment_order_id}::uuid`;
   await tx.$executeRaw`update public.entitlements set status='refunded',updated_at=now() where payment_id=${payment.id}::uuid and status='active'`;
  }
  const cumulative=(await tx.$queryRaw<Array<{refunded_amount_in_paise:number}>>`select refunded_amount_in_paise from public.payments where id=${payment.id}::uuid`)[0]?.refunded_amount_in_paise??refunded;
  await updateReferralRefund(tx,payment.id,cumulative,fullRefund);
 });
}
