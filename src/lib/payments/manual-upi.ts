export function manualUpiConfig(){
  const enabled=process.env.MANUAL_UPI_ENABLED?.toLowerCase()!=="false";
  return {enabled,upiId:process.env.MANUAL_UPI_ID?.trim()??"",recipientName:process.env.MANUAL_UPI_RECIPIENT_NAME?.trim()??"",supportEmail:process.env.PAYMENT_SUPPORT_EMAIL?.trim()??""};
}

export function requireManualUpiConfig(){
  const config=manualUpiConfig();
  if(!config.enabled||!config.upiId)throw new Error("Direct UPI payment is not configured.");
  return config;
}

export function normalizeUtr(value:string){return value.trim().replace(/\s+/g,"").toUpperCase()}

export function upiPaymentUri(input:{upiId:string;recipientName:string;amountInPaise:number;reference:string}){
  const query=new URLSearchParams({pa:input.upiId,am:(input.amountInPaise/100).toFixed(2),cu:"INR",tn:`Taksh ${input.reference}`});
  if(input.recipientName)query.set("pn",input.recipientName);
  return `upi://pay?${query.toString()}`;
}
