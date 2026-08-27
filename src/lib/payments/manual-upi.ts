export function manualUpiConfig(){
  const enabled=process.env.MANUAL_UPI_ENABLED?.toLowerCase()!=="false";
  return {enabled,upiId:process.env.TAKSH_UPI_ID?.trim()??"",recipientName:"Taksh",supportEmail:process.env.PAYMENT_SUPPORT_EMAIL?.trim()||process.env.SUPPORT_EMAIL?.trim()||""};
}

export function requireManualUpiConfig(){
  const config=manualUpiConfig();
  if(!config.enabled||!config.upiId)throw new Error("Direct UPI payment is not configured.");
  return config;
}

export function normalizeUtr(value:string){return value.trim().replace(/\s+/g,"").toUpperCase()}

export function createTakshOrderReference(){return `TAKSH-${crypto.randomUUID().replaceAll("-","").slice(0,6).toUpperCase()}`}

export function upiPaymentUri(input:{upiId:string;recipientName:string;amountInPaise:number;reference:string}){
  const query=new URLSearchParams({pa:input.upiId,am:(input.amountInPaise/100).toFixed(2),cu:"INR",tn:`Taksh ${input.reference}`});
  if(input.recipientName)query.set("pn",input.recipientName);
  return `upi://pay?${query.toString()}`;
}
