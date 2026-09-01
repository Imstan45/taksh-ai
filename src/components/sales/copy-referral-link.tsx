"use client";

import { useState } from "react";

export function CopyReferralLink({ url }: { url: string }) {
  const [copied,setCopied]=useState(false);
  async function copy(){await navigator.clipboard.writeText(url);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}
  return <div className="flex flex-col gap-2 sm:flex-row"><input aria-label="Referral link" className="sales-field min-w-0 flex-1 bg-zinc-50" readOnly value={url}/><button className="sales-secondary-button shrink-0" onClick={copy} type="button">{copied?"Copied":"Copy link"}</button></div>;
}
