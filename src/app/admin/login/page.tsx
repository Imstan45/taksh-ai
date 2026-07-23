import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <section className="glass-card w-full max-w-md p-8">
        <Suspense fallback={null}>
          <AuthForm mode="login" portal="admin" />
        </Suspense>
      </section>
    </main>
  );
}
