import NextAuth, { type DefaultSession } from "next-auth";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db";
import { authConfig } from "./auth.config";
import { ensureCompanyForUser, getCompanyForUserId } from "@/lib/companies";

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
    companyId?: number | null;
    companySlug?: string | null;
    companyName?: string | null;
  }
}

const SIGN_IN_SUBJECT = "Connexion à Horaires du bureau";

async function sendWithResend(params: {
  to: string;
  url: string;
  from: string;
  apiKey: string;
}) {
  const { to, url, from, apiKey } = params;
  const html = renderMagicLinkHtml(url);
  const text = renderMagicLinkText(url);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: SIGN_IN_SUBJECT,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend a renvoyé ${res.status}: ${detail}`);
  }
}

function renderMagicLinkHtml(url: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px;">
      <h1 style="font-size:18px; margin:0 0 12px;">Horaires du bureau</h1>
      <p style="margin:0 0 16px; color:#475569;">Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est valable 24 heures et ne peut être utilisé qu'une seule fois.</p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block; padding:10px 18px; border-radius:8px; background:#3a3fe6; color:#ffffff; text-decoration:none; font-weight:600;">Se connecter</a>
      </p>
      <p style="margin:0; color:#94a3b8; font-size:12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>
    </div>
  </body>
</html>`;
}

function renderMagicLinkText(url: string): string {
  return `Connectez-vous à Horaires du bureau en suivant ce lien (valable 24 heures) :\n\n${url}\n`;
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
      async sendVerificationRequest({ identifier, url, provider }) {
        const apiKey = process.env.AUTH_RESEND_KEY;
        if (apiKey) {
          await sendWithResend({
            to: identifier,
            url,
            from: provider.from ?? "onboarding@resend.dev",
            apiKey,
          });
        } else {
          // Fallback dev : on imprime le lien dans la console.
          console.log(
            `\n=== [DEV] Lien magique pour ${identifier} ===\n${url}\n=============================================\n`,
          );
        }
      },
    },
  ],
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      await ensureCompanyForUser(Number(user.id), user.email);
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = String(user.id);
      }
      if (token.userId) {
        const company = await getCompanyForUserId(Number(token.userId));
        token.companyId = company?.id ?? null;
        token.companySlug = company?.slug ?? null;
        token.companyName = company?.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "");
        session.user.companyId = token.companyId ?? null;
        session.user.companySlug = token.companySlug ?? null;
        session.user.companyName = token.companyName ?? null;
      }
      return session;
    },
  },
});
