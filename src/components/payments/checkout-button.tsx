"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export function CheckoutButton({productId}:{productId:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");const router=useRouter();
 async function pay(){setBusy(true);setMessage("");try{
  const attribution=Object.fromEntries(new URLSearchParams(window.location.search));
  const response=await fetch("/api/payments/dodo/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId,attribution})});
  const result=await response.json();if(!response.ok){if(result.alreadyOwned){router.push("/student/courses");return;}throw new Error(result.error||"Unable to start checkout");}
  if(!result.checkoutUrl)throw new Error("Secure checkout was not returned");window.location.assign(result.checkoutUrl);
 }catch(error){setBusy(false);setMessage(error instanceof Error?error.message:"Unable to start checkout");}}
 return <><button onClick={pay} disabled={busy} className="btn-primary w-full">{busy?"Opening secure checkout…":"Pay securely with Dodo Payments"}</button>{message&&<p role="status" aria-live="polite" className="mt-4 text-sm text-zinc-600">{message}</p>}</>;
}
