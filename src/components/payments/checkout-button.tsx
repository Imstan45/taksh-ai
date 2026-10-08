"use client";

import { initializePaddle } from "@paddle/paddle-js";
import { useState } from "react";
import { useRouter } from "next/navigation";

type PaddleCheckoutResponse = {
  priceId: string;
  reference: string;
  email: string;
  successUrl: string;
  customData: Record<string, unknown>;
  error?: string;
  alreadyOwned?: boolean;
};

export function CheckoutButton({ productId }: { productId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function begin() {
    setBusy(true);
    setMessage("");
    try {
      const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (!clientToken) throw new Error("Paddle checkout is temporarily unavailable.");

      const attribution = Object.fromEntries(new URLSearchParams(window.location.search));
      const response = await fetch("/api/payments/paddle/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, attribution }),
      });
      const result = (await response.json()) as PaddleCheckoutResponse;
      if (!response.ok) {
        if (result.alreadyOwned) {
          router.push("/student/courses");
          return;
        }
        throw new Error(result.error || "Unable to start Paddle checkout.");
      }

      const paddle = await initializePaddle({
        token: clientToken,
        environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
      });
      if (!paddle) throw new Error("Paddle checkout could not be loaded.");

      paddle.Checkout.open({
        items: [{ priceId: result.priceId, quantity: 1 }],
        customer: { email: result.email },
        customData: result.customData,
        settings: {
          displayMode: "overlay",
          theme: "light",
          successUrl: result.successUrl,
        },
      });
      setBusy(false);
    } catch (error) {
      setBusy(false);
      setMessage(error instanceof Error ? error.message : "Unable to start Paddle checkout.");
    }
  }

  return (
    <>
      <button className="btn-primary w-full" disabled={busy} onClick={begin}>
        {busy ? "Opening secure checkout…" : "Pay securely with Paddle"}
      </button>
      {message ? <p className="mt-4 text-sm text-red-700" role="alert">{message}</p> : null}
    </>
  );
}
