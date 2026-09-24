"use client";

import { ShieldAlert } from "lucide-react";
import { signOutAllDevices } from "@/app/security/actions";

export function SignOutAllDevicesButton() {
  return (
    <form
      action={signOutAllDevices}
      onSubmit={(event) => {
        if (!window.confirm("Sign out of Taksh AI on every device? You will need to sign in again everywhere.")) {
          event.preventDefault();
        }
      }}
    >
      <button className="btn-ghost gap-2" title="Revoke every active Taksh AI session" type="submit">
        <ShieldAlert className="size-4" /> Sign out all devices
      </button>
    </form>
  );
}
