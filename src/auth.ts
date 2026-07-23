import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/auth/validation";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, rememberMe: {}, portal: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
          rememberMe: credentials.rememberMe === "true",
        });
        if (!parsed.success) return null;
        const supabase = createSupabaseServerClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error || !data.user) return null;
        const { data: roleRecord, error: roleError } = await supabase
          .from("user_roles")
          .select("role,account_status,authorization_version")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (roleError || !roleRecord || roleRecord.account_status !== "active") return null;

        const storedRole = roleRecord?.role;
        if (!["STUDENT", "FACULTY", "COLLEGE_ADMIN", "SUPER_ADMIN"].includes(storedRole)) return null;
        const role = storedRole as UserRole;
        const portal = String(credentials.portal ?? "student");
        const portalAllowed =
          (portal === "student" && role === "STUDENT") ||
          (portal === "super-admin" && role === "SUPER_ADMIN") ||
          (portal === "admin" && (role === "COLLEGE_ADMIN" || role === "FACULTY"));
        if (!portalAllowed) return null;

        return {
          id: data.user.id,
          name: String(data.user.user_metadata.full_name ?? data.user.email?.split("@")[0] ?? "Student"),
          email: data.user.email,
          role,
          accountStatus: roleRecord.account_status,
          authorizationVersion: roleRecord.authorization_version,
          rememberMe: parsed.data.rememberMe,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.rememberMe = user.rememberMe;
        token.accountStatus = user.accountStatus;
        token.authorizationVersion = user.authorizationVersion;
      } else if (token.id) {
        const { data } = await createSupabaseAdminClient()
          .from("user_roles")
          .select("role,account_status,authorization_version")
          .eq("user_id", token.id)
          .maybeSingle();
        if (!data || data.account_status !== "active") {
          token.accountStatus = data?.account_status ?? "disabled";
        } else {
          token.role = data.role as UserRole;
          token.accountStatus = data.account_status;
          token.authorizationVersion = data.authorization_version;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      if (token.role) session.user.role = token.role;
      session.user.accountStatus = token.accountStatus;
      session.user.authorizationVersion = token.authorizationVersion;
      return session;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (session?.user && session.user.accountStatus !== "active") return false;
      if (path === "/super-admin/login") {
        if (session?.user.role === "SUPER_ADMIN") {
          return Response.redirect(new URL("/super-admin", request.nextUrl));
        }
        return true;
      }
      if (path === "/admin/login") {
        if (session?.user.role === "COLLEGE_ADMIN" || session?.user.role === "FACULTY") {
          return Response.redirect(new URL("/admin", request.nextUrl));
        }
        return true;
      }
      if (!path.startsWith("/dashboard") && !path.startsWith("/profile") && !path.startsWith("/continue-learning") && !path.startsWith("/student") && !path.startsWith("/assessment") && !path.startsWith("/profiling") && !path.startsWith("/learning-style") && !path.startsWith("/admin") && !path.startsWith("/super-admin")) return true;
      if (!session?.user) {
        if (path.startsWith("/super-admin")) {
          const loginUrl = new URL("/super-admin/login", request.nextUrl);
          loginUrl.searchParams.set("callbackUrl", path);
          return Response.redirect(loginUrl);
        }
        if (path.startsWith("/admin")) {
          const loginUrl = new URL("/admin/login", request.nextUrl);
          loginUrl.searchParams.set("callbackUrl", path);
          return Response.redirect(loginUrl);
        }
        return false;
      }
      if (path.startsWith("/super-admin")) return session.user.role === "SUPER_ADMIN";
      if (path.startsWith("/admin")) return ["COLLEGE_ADMIN", "FACULTY"].includes(session.user.role);
      return session.user.role === "STUDENT";
    },
  },
});
