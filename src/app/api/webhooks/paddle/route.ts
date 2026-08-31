import {prisma} from "@/lib/prisma";
import {activatePaddlePayment,refundPaddlePayment,verifyPaddleSignature} from "@/lib/payments/paddle";

export const runtime="nodejs";

type PaddleEvent={
 event_id:string;event_type:string;
 data:{id:string;status?:string;action?:string;type?:string;transaction_id?:string;currency_code?:string;totals?:{total?:string};custom_data?:Record<string,unknown>|null;items?:Array<{price?:{product_id?:string;unit_price?:{amount?:string;currency_code?:string}}}>};
};

export async function POST(request:Request){
 const raw=await request.text(),signature=request.headers.get("paddle-signature")||"",secret=process.env.PADDLE_WEBHOOK_SECRET||"";
 if(!secret||!verifyPaddleSignature(raw,signature,secret))return Response.json({error:"Invalid signature"},{status:401});
 let event:PaddleEvent;try{event=JSON.parse(raw) as PaddleEvent;}catch{return Response.json({error:"Invalid payload"},{status:400});}
 if(!event.event_id||!event.event_type||!event.data?.id)return Response.json({error:"Invalid payload"},{status:400});
 const inserted=await prisma.$queryRaw<Array<{id:string}>>`insert into public.payment_webhook_events(provider,external_event_id,event_type) values('paddle',${event.event_id},${event.event_type}) on conflict(provider,external_event_id) do nothing returning id`;
 if(!inserted[0])return Response.json({received:true,duplicate:true});
 try{
  if(event.event_type==="transaction.completed"){
   const reference=typeof event.data.custom_data?.taksh_order_reference==="string"?event.data.custom_data.taksh_order_reference:"",amount=Number(event.data.items?.[0]?.price?.unit_price?.amount),paddleProductId=event.data.items?.[0]?.price?.product_id,currency=event.data.items?.[0]?.price?.unit_price?.currency_code;
   if(!reference||!Number.isSafeInteger(amount)||amount<0||!currency||!paddleProductId||event.data.items?.length!==1)throw new Error("Paddle transaction metadata is incomplete");
   await activatePaddlePayment({reference,transactionId:event.data.id,amount,currency,paddleProductId});
  }else if(event.event_type==="transaction.payment_failed"||event.event_type==="transaction.canceled"){
   const reference=typeof event.data.custom_data?.taksh_order_reference==="string"?event.data.custom_data.taksh_order_reference:"";if(reference)await prisma.$executeRaw`update public.payment_orders set status=${event.event_type==="transaction.payment_failed"?'failed':'cancelled'},updated_at=now() where provider='paddle' and internal_order_reference=${reference}`;
  }else if((event.event_type==="adjustment.created"||event.event_type==="adjustment.updated")&&(event.data.action==="refund"||event.data.action==="chargeback")&&event.data.status==="approved"&&event.data.transaction_id){
   await refundPaddlePayment(event.data.transaction_id,event.data.type==="full"||event.data.action==="chargeback",Number(event.data.totals?.total??0));
  }
  await prisma.$executeRaw`update public.payment_webhook_events set processing_status='processed',processed_at=now() where id=${inserted[0].id}::uuid`;
  return Response.json({received:true});
 }catch(error){await prisma.$executeRaw`delete from public.payment_webhook_events where id=${inserted[0].id}::uuid`;console.error("Paddle webhook processing failed",error);return Response.json({error:"Processing failed"},{status:500});}
}
