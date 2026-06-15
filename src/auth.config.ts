import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        (session.user as { role?: string }).role = (token.role as string) ?? "USER";
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as { role?: string } | undefined)?.role;
      const isAdmin = role === "ADMIN";
      const path = nextUrl.pathname;

      if (path.startsWith("/api/auth")) return true;
      // MercadoPago calls the payment webhook server-to-server with no session.
      if (path.startsWith("/api/mp")) return true;
      // El cron de resultados se autentica con CRON_SECRET, no con sesión.
      if (path.startsWith("/api/cron")) return true;
      if (path.startsWith("/login")) return isLoggedIn ? Response.redirect(new URL("/", nextUrl)) : true;
      if (!isLoggedIn) return false;
      if (path.startsWith("/admin") && !isAdmin) return Response.redirect(new URL("/", nextUrl));
      return true;
    },
  },
};
