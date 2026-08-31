import {prisma} from "@/lib/prisma";
import {activateDodoPayment,dodoClient,refundDodoPayment} from "@/lib/payments/dodo";

export const runtime="nodejs";

export async function POST(request:Request){
 const raw=await request.text(),webhookId=request.headers.get("webhook-id")||"",signature=request.headers.get("webhook-signature")||"",timestamp=request.headers.get("webhook-timestamp")||"";
 if(!webhookId||!signature||!timestamp||!process.env.DODO_PAYMENTS_WEBHOOK_KEY)return Response.json({error:"Invalid signature"},{status:401});
 let event;try{event=dodoClient().webhooks.unwrap(raw,{headers:{"webhook-id":webhookId,"webhook-signature":signature,"webhook-timestamp":timestamp}})}catch{return Response.json({error:"Invalid signature"},{status:401})}
 const inserted=await prisma.$queryRaw<Array<{id:string}>>`insert into public.payment_webhook_events(provider,external_event_id,event_type) values('dodo',${webhookId},${event.type}) on conflict(provider,external_event_id) do nothing returning id`;
 if(!inserted[0])return Response.json({received:true,duplicate:true});
 try{
  if(event.type==="payment.succeeded"){
   const metadataReference=event.data.metadata?.taksh_order_reference,reference=typeof metadataReference==="string"?metadataReference:"",providerProductId=event.data.product_cart?.[0]?.product_id;
   if(!reference||!providerProductId||event.data.product_cart?.length!==1)throw new Error("Dodo payment metadata is incomplete");
   await activateDodoPayment({reference,paymentId:event.data.payment_id,amount:event.data.total_amount,currency:event.data.currency,providerProductId});
  }else if(event.type==="payment.failed"||event.type==="payment.cancelled"){
   const metadataReference=event.data.metadata?.taksh_order_reference,reference=typeof metadataReference==="string"?metadataReference:"";if(reference)await prisma.$executeRaw`update public.payment_orders set status=${event.type==="payment.failed"?'failed':'cancelled'},updated_at=now() where provider='dodo' and internal_order_reference=${reference}`;
  }else if(event.type==="refund.succeeded"){const refund=event.data as unknown as {payment_id?:string;amount?:number|null;is_partial?:boolean};if(refund.payment_id)await refundDodoPayment(refund.payment_id,refund.amount??0,refund.is_partial===true)}
  await prisma.$executeRaw`update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=${inserted[0].id}::uuid`;
  return Response.json({received:true});
 }catch(error){await prisma.$executeRaw`delete from public.payment_webhook_events where id=${inserted[0].id}::uuid`;console.error("Dodo webhook processing failed",error);return Response.json({error:"Processing failed"},{status:500});}
}
