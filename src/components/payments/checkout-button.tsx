"use client";
import Script from "next/script";
import {useState} from "react";
import {useRouter} from "next/navigation";
declare global{interface Window{Razorpay?:new(o:Record<string,unknown>)=>{open():void;on(name:string,fn:()=>void):void}}}

export function CheckoutButton({productId}:{productId:string}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");const router=useRouter();
  async function pay(){setBusy(true);setMessage("");try{
    const attribution=Object.fromEntries(new URLSearchParams(window.location.search));
    const response=await fetch("/api/payments/create-order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId,attribution})});
    const order=await response.json();if(!response.ok){if(order.alreadyOwned){router.push("/student/courses");return;}throw new Error(order.error);}
    if(!window.Razorpay)throw new Error("Secure checkout is still loading. Please try again.");
    const checkout=new window.Razorpay({key:order.keyId,amount:order.amount,currency:order.currency,name:"Taksh AI",description:order.productName,order_id:order.orderId,
      handler:async(payment:Record<string,string>)=>{setMessage("Confirming your payment and activating access…");const verification=await fetch("/api/payments/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payment)});const result=await verification.json();if(!verification.ok){setBusy(false);throw new Error(result.error??"Payment verification is pending. Check Purchase History before retrying.");}router.push(`/payment-success?reference=${encodeURIComponent(order.reference)}`);},
      modal:{ondismiss:()=>{setBusy(false);setMessage("Checkout closed. No access was activated.");}}});
    checkout.on("payment.failed",()=>{setBusy(false);setMessage("Payment failed. Access was not granted. You can retry safely.");});checkout.open();
  }catch(error){setBusy(false);setMessage(error instanceof Error?error.message:"Unable to start checkout");}}
  return <><Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive"/><button onClick={pay} disabled={busy} className="btn-primary w-full">{busy?"Opening secure checkout…":"Pay securely with Razorpay"}</button>{message&&<p role="status" aria-live="polite" className="mt-4 text-sm text-zinc-600">{message}</p>}</>;
}
