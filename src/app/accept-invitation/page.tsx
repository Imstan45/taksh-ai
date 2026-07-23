"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function InvitationAcceptance() {
  const invitationId = useSearchParams().get("invitation");
  const invitationToken = useSearchParams().get("invitation_token");
  const [message, setMessage] = useState("Accepting your invitation…");
  const [destination, setDestination] = useState<string>();
  useEffect(() => {
    void (async () => {
      if (!invitationId || !invitationToken) {
        setMessage("The invitation link is incomplete or expired.");
        return;
      }
      const { data } = await createSupabaseBrowserClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setMessage("Sign in with the invited email, then reopen this invitation link.");
        return;
      }
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ invitationId, invitationToken }),
      });
      const payload = await response.json();
      setDestination(response.ok ? payload.destination : undefined);
      setMessage(response.ok ? "Invitation accepted. You can now sign in." : payload.error ?? "Invitation could not be accepted.");
    })();
  }, [invitationId, invitationToken]);
  return <main className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-white"><section className="glass-card max-w-md text-center"><h1 className="text-2xl font-semibold">Taksh AI invitation</h1><p className="mt-4 text-zinc-400">{message}</p>{destination && <Link className="btn-primary mt-6" href={destination}>Continue to sign in</Link>}</section></main>;
}

export default function AcceptInvitationPage() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-zinc-950 text-white">Loading invitation…</main>}><InvitationAcceptance /></Suspense>;
}
