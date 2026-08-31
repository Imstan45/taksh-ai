import DodoPayments from "dodopayments";
import { prisma } from "@/lib/prisma";
import {dodoEnvironment,dodoProductId} from "@/lib/payments/dodo-config";
import {recordReferralSale,updateReferralRefund} from "@/lib/referrals/sales";
export {dodoEnvironment,dodoProductId} from "@/lib/payments/dodo-config";
export function dodoClient(){
  const bearerToken=process.env.DODO_PAYMENTS_API_KEY,webhookKey=process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if(!bearerToken)throw new Error("Dodo Payments is not configured");
  return new DodoPayments({bearerToken,webhookKey,environment:dodoEnvironment()});
}

export async function activateDodoPayment(input:{reference:string;paymentId:string;amount:number;currency:string;providerProductId:string}){
 return prisma.$transaction(async tx=>{
  const rows=await tx.$queryRaw<Array<{id:string;user_id:string;product_id:string;amount_in_paise:number;currency:string;product_type:"course"|"bundle"}>>`
   select o.id,o.user_id,o.product_id,o.amount_in_paise,o.currency,p.product_type from public.payment_orders o join public.products p on p.id=o.product_id
   where o.internal_order_reference=${input.reference} and o.provider='dodo' for update`;
  const order=rows[0];if(!order)throw new Error("Dodo order not found");
  if(order.amount_in_paise!==input.amount||order.currency.toUpperCase()!==input.currency.toUpperCase())throw new Error("Dodo payment amount mismatch");
  if(dodoProductId(order.product_type)!==input.providerProductId)throw new Error("Dodo payment product mismatch");
  const existing=await tx.$queryRaw<Array<{id:string}>>`select id from public.payments where provider='dodo' and provider_payment_id=${input.paymentId}`;
  if(existing[0])return {duplicate:true};
  const payments=await tx.$queryRaw<Array<{id:string}>>`insert into public.payments(user_id,payment_order_id,provider,provider_payment_id,amount_in_paise,currency,status,verified_at)
   values(${order.user_id}::uuid,${order.id}::uuid,'dodo',${input.paymentId},${order.amount_in_paise},${order.currency},'captured',now()) returning id`;
  await tx.$executeRaw`update public.payment_orders set status='paid',updated_at=now() where id=${order.id}::uuid`;
  await tx.$executeRaw`insert into public.entitlements(user_id,product_id,payment_id,starts_at,expires_at,status,grant_source)
   values(${order.user_id}::uuid,${order.product_id}::uuid,${payments[0].id}::uuid,now(),null,'active','payment')
   on conflict(user_id,product_id) where status='active' and product_id is not null do nothing`;
  await tx.$executeRaw`insert into public.product_events(user_id,event_name,product_id,properties) values(${order.user_id}::uuid,'payment_success',${order.product_id}::uuid,${JSON.stringify({provider:"dodo",paymentId:input.paymentId,amountInPaise:order.amount_in_paise})}::jsonb)`;
  await tx.$executeRaw`update public.campaign_attributions set purchased_at=now(),purchased_product_id=${order.product_id}::uuid,revenue_in_paise=${order.amount_in_paise} where id=(select id from public.campaign_attributions where user_id=${order.user_id}::uuid order by first_touched_at desc limit 1)`;
  await recordReferralSale(tx,{paymentId:payments[0].id,orderId:order.id,provider:"dodo",providerPaymentReference:input.paymentId});
  return {duplicate:false};
 });
}

export async function refundDodoPayment(paymentReference:string,amount:number,isPartial:boolean){return prisma.$transaction(async tx=>{const payment=(await tx.$queryRaw<Array<{id:string;payment_order_id:string;amount_in_paise:number;refunded_amount_in_paise:number}>>`select id,payment_order_id,amount_in_paise,refunded_amount_in_paise from public.payments where provider='dodo' and provider_payment_id=${paymentReference} for update`)[0];if(!payment)return;const refunded=Math.min(payment.amount_in_paise,Math.max(payment.refunded_amount_in_paise,amount)),full=!isPartial||refunded>=payment.amount_in_paise;await tx.$executeRaw`update public.payments set status=${full?'refunded':'partially_refunded'},refunded_amount_in_paise=${refunded},updated_at=now() where id=${payment.id}::uuid`;if(full){await tx.$executeRaw`update public.payment_orders set status='refunded',updated_at=now() where id=${payment.payment_order_id}::uuid`;await tx.$executeRaw`update public.entitlements set status='refunded',updated_at=now() where payment_id=${payment.id}::uuid and status='active'`;}await updateReferralRefund(tx,payment.id,refunded,full)})}
