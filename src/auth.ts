import NextAuth, { type DefaultSession } from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db";
import { authConfig } from "./auth.config";
import { ensureCompanyForUser, getCompanyForUserId } from "@/lib/companies";
import {
  acceptInvitation,
  findPendingInvitationsForEmail,
} from "@/lib/invitations";
import { renderMagicLinkEmail, sendEmail } from "@/lib/email";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: number | null;
      companySlug: string | null;
      companyName: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PostgresAdapter(pool),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    {
      id: "email",
      type: "email",
      name: "Email",
      from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
      maxAge: 24 * 60 * 60,
      server: {},
      options: {},
      async sendVerificationRequest({ identifier, url }) {
        const { subject, html, text } = renderMagicLinkEmail(url);
        await sendEmail({ to: identifier, subject, html, text });
      },
    },
  ],
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const userId = Number(user.id);
      // If there's a pending invitation for this email, attach the user to that
      // company instead of auto-creating a personal one.
      const pending = await findPendingInvitationsForEmail(user.email);
      if (pending.length > 0) {
        try {
          await acceptInvitation({
            token: pending[0].token,
            userId,
            userEmail: user.email,
          });
          return;
        } catch {
          // Fall through to default behavior on unexpected failure.
        }
      }
      await ensureCompanyForUser(userId, user.email);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = String(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        const userId = token.userId ? Number(token.userId) : null;
        const company = userId ? await getCompanyForUserId(userId) : null;
        session.user.companyId = company?.id ?? null;
        session.user.companySlug = company?.slug ?? null;
        session.user.companyName = company?.name ?? null;
      }
      return session;
    },
  },
});
