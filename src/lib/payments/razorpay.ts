import {activatePayment as settlePayment}from"@/lib/payments/settlement";
export {validSignature} from "@/lib/payments/signature";

export function paymentEnvironment(){
  const keyId=process.env.RAZORPAY_KEY_ID, keySecret=process.env.RAZORPAY_KEY_SECRET, webhookSecret=process.env.RAZORPAY_WEBHOOK_SECRET;
  return {keyId,keySecret,webhookSecret,publicKey:process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,ready:Boolean(keyId&&keySecret&&webhookSecret)};
}
export async function activatePayment(orderId:string,paymentId:string){
  return settlePayment("razorpay",orderId,paymentId);
}
