import{createHmac,timingSafeEqual}from"node:crypto";
export type CreatePaymentOrderInput={amountInPaise:number;currency:string;receipt:string;productId:string};
export type CreatedPaymentOrder={providerOrderId:string};
export interface PaymentProvider{readonly name:string;createOrder(input:CreatePaymentOrderInput):Promise<CreatedPaymentOrder>;verifyPayment(input:{orderId:string;paymentId:string;signature:string}):boolean;verifyWebhook(payload:string,signature:string):boolean}
class RazorpayPaymentProvider implements PaymentProvider{
 readonly name="razorpay";constructor(private keyId:string,private keySecret:string,private webhookSecret?:string){}
 async createOrder(input:CreatePaymentOrderInput){const response=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`,"content-type":"application/json"},body:JSON.stringify({amount:input.amountInPaise,currency:input.currency,receipt:input.receipt,notes:{internal_reference:input.receipt,product_id:input.productId}})}),body=await response.json()as{id?:string;error?:{description?:string}};if(!response.ok||!body.id)throw new Error(body.error?.description||"Unable to create payment order");return{providerOrderId:body.id}}
 verifyPayment({orderId,paymentId,signature}:{orderId:string;paymentId:string;signature:string}){return this.matches(`${orderId}|${paymentId}`,signature,this.keySecret)}
 verifyWebhook(payload:string,signature:string){return Boolean(this.webhookSecret)&&this.matches(payload,signature,this.webhookSecret!)}
 private matches(payload:string,signature:string,secret:string){const expected=createHmac("sha256",secret).update(payload).digest("hex");if(expected.length!==signature.length)return false;return timingSafeEqual(Buffer.from(expected),Buffer.from(signature))}
}
export function paymentProvider(){const keyId=process.env.RAZORPAY_KEY_ID,keySecret=process.env.RAZORPAY_KEY_SECRET;if(!keyId||!keySecret)throw new Error("Payments are not configured");return new RazorpayPaymentProvider(keyId,keySecret,process.env.RAZORPAY_WEBHOOK_SECRET)}
