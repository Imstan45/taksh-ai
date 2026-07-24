"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

type State = { sequence: number; type: "idle" | "success" | "error"; message: string };

export function ActionFeedbackForm({
  action,
  successMessage,
  pendingMessage = "Saving changes…",
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  successMessage: string;
  pendingMessage?: string;
  confirmMessage?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);
  const [state, formAction, pending] = useActionState(async (previous: State, formData: FormData): Promise<State> => {
    try {
      await action(formData);
      return { sequence: previous.sequence + 1, type: "success", message: successMessage };
    } catch (error) {
      return { sequence: previous.sequence + 1, type: "error", message: error instanceof Error ? error.message : "The action could not be completed." };
    }
  }, { sequence: 0, type: "idle", message: "" } satisfies State);

  useEffect(() => {
    if (state.type === "idle") return;
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), state.type === "success" ? 4000 : 7000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  return (
    <>
      <form action={formAction} className={className} onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}>
        <fieldset className="contents" disabled={pending}>{children}</fieldset>
      </form>
      {pending && <ActionToast type="pending" message={pendingMessage} />}
      {!pending && visible && state.type !== "idle" && <ActionToast type={state.type} message={state.message} onClose={() => setVisible(false)} />}
    </>
  );
}

function ActionToast({ type, message, onClose }: { type: "pending" | "success" | "error"; message: string; onClose?: () => void }) {
  const Icon = type === "pending" ? LoaderCircle : type === "success" ? CheckCircle2 : XCircle;
  return <div role={type === "error" ? "alert" : "status"} aria-live="polite" className={`fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${type === "success" ? "border-emerald-400/25 bg-emerald-950/95 text-emerald-100" : type === "error" ? "border-red-400/25 bg-red-950/95 text-red-100" : "border-violet-400/25 bg-[#171323]/95 text-violet-100"}`}>
    <Icon className={`mt-0.5 size-5 shrink-0 ${type === "pending" ? "animate-spin" : ""}`} />
    <span className="text-sm leading-5">{message}</span>
    {onClose && <button className="ml-2 text-lg leading-4 opacity-70 hover:opacity-100" aria-label="Dismiss notification" onClick={onClose}>×</button>}
  </div>;
}
