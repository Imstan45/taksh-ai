import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/auth/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, rememberMe: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe === "true",
        });
        if (!parsed.success) return null;
        const { data, error } = await createSupabaseServerClient().auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error || !data.user) return null;
        const role = data.user.user_metadata.role === "COLLEGE_ADMIN" || data.user.user_metadata.role === "SUPER_ADMIN"
          ? data.user.user_metadata.role
          : "STUDENT";
        return {
          id: data.user.id,
          name: String(data.user.user_metadata.full_name ?? data.user.email?.split("@")[0] ?? "Student"),
          email: data.user.email,
          role,
          rememberMe: parsed.data.rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.rememberMe = user.rememberMe;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      if (token.role) session.user.role = token.role;
      return session;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (!path.startsWith("/dashboard") && !path.startsWith("/profile") && !path.startsWith("/assessment") && !path.startsWith("/admin") && !path.startsWith("/super-admin")) return true;
      if (!session?.user) return false;
      if (path.startsWith("/super-admin")) return session.user.role === "SUPER_ADMIN";
      if (path.startsWith("/admin")) return ["COLLEGE_ADMIN", "SUPER_ADMIN"].includes(session.user.role);
      return true;
    },
  },
});
