"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {initializePaddle} from "@paddle/paddle-js";

export function CheckoutButton({productId}:{productId:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");const router=useRouter();
 async function pay(){setBusy(true);setMessage("");try{
  const attribution=Object.fromEntries(new URLSearchParams(window.location.search));
  const response=await fetch("/api/payments/paddle/checkout",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({productId,attribution})});
  const result=await response.json();if(!response.ok){if(result.alreadyOwned){router.push("/student/courses");return;}throw new Error(result.error||"Unable to start checkout");}
  const token=process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,environment=process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT==="sandbox"?"sandbox":"production";if(!token)throw new Error("Paddle checkout is not configured");
  const paddle=await initializePaddle({token,environment});if(!paddle)throw new Error("Paddle checkout could not be loaded");
  paddle.Checkout.open({items:[{priceId:result.priceId,quantity:1}],customer:{email:result.email},customData:result.customData,settings:{displayMode:"overlay",theme:"light",successUrl:result.successUrl}});setBusy(false);
 }catch(error){setBusy(false);setMessage(error instanceof Error?error.message:"Unable to start checkout");}}
 return <><button onClick={pay} disabled={busy} className="btn-primary w-full">{busy?"Opening secure checkout…":"Pay securely with Paddle"}</button>{message&&<p role="status" aria-live="polite" className="mt-4 text-sm text-zinc-600">{message}</p>}</>;
}
