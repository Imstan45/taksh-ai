import { prisma } from "@/lib/prisma";
export {validSignature} from "@/lib/payments/signature";

export function paymentEnvironment(){
  const keyId=process.env.RAZORPAY_KEY_ID, keySecret=process.env.RAZORPAY_KEY_SECRET, webhookSecret=process.env.RAZORPAY_WEBHOOK_SECRET;
  return {keyId,keySecret,webhookSecret,publicKey:process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,ready:Boolean(keyId&&keySecret&&webhookSecret)};
}
export async function activatePayment(orderId:string,paymentId:string){
  return prisma.$transaction(async tx=>{
    const rows=await tx.$queryRaw<Array<{id:string;user_id:string;plan_id:string;amount_in_paise:number;currency:string;duration_days:number}>>`
      select o.id,o.user_id,o.plan_id,o.amount_in_paise,o.currency,p.duration_days from public.payment_orders o join public.plans p on p.id=o.plan_id where o.razorpay_order_id=${orderId} for update`;
    const order=rows[0]; if(!order) throw new Error("Order not found");
    const existing=await tx.$queryRaw<Array<{id:string}>>`select id from public.payments where razorpay_payment_id=${paymentId}`;
    if(existing[0]) return {paymentId:existing[0].id,duplicate:true};
    const payments=await tx.$queryRaw<Array<{id:string}>>`insert into public.payments(user_id,payment_order_id,razorpay_payment_id,razorpay_order_id,amount_in_paise,currency,status,verified_at) values(${order.user_id}::uuid,${order.id}::uuid,${paymentId},${orderId},${order.amount_in_paise},${order.currency},'captured',now()) returning id`;
    await tx.$executeRaw`update public.payment_orders set status='paid',updated_at=now() where id=${order.id}::uuid`;
    await tx.$executeRaw`insert into public.entitlements(user_id,plan_id,payment_id,starts_at,expires_at,status) values(${order.user_id}::uuid,${order.plan_id}::uuid,${payments[0].id}::uuid,now(),now()+(${order.duration_days}||' days')::interval,'active') on conflict(payment_id) do nothing`;
    return {paymentId:payments[0].id,duplicate:false};
  });
}
