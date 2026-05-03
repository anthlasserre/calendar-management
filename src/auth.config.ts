import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      const isPublic =
        path.startsWith("/sign-in") ||
        path.startsWith("/auth/") ||
        path.startsWith("/api/auth/") ||
        path.startsWith("/c/") ||
        path === "/favicon.ico";

      if (isPublic) return true;
      if (isLoggedIn) return true;
      return false;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
