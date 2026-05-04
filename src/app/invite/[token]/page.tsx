import Link from "next/link";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { getInvitationByToken } from "@/lib/invitations";
import { Building, Mail } from "@/components/icons";
import { AcceptInvitationButton } from "./AcceptInvitationButton";

export const dynamic = "force-dynamic";

type Params = { token: string };

export default async function InvitePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-300/30 blur-3xl" />
        <div className="absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent-500/20 blur-3xl" />
      </div>
      <InviteCard token={token} invitation={invitation} />
    </main>
  );
}

async function InviteCard({
  token,
  invitation,
}: {
  token: string;
  invitation: Awaited<ReturnType<typeof getInvitationByToken>>;
}) {
  const session = (await auth()) as Session | null;

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="mb-6 flex items-center justify-center gap-2 text-slate-600">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lift">
          <Building size={16} />
        </span>
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          Horaires du bureau
        </span>
      </div>

      <div className="surface-card p-7">
        {!invitation ? (
          <ErrorState
            title="Invitation introuvable"
            message="Ce lien d'invitation n'est pas valide. Demandez à l'administrateur de vous renvoyer une invitation."
          />
        ) : invitation.acceptedAt ? (
          <ErrorState
            title="Invitation déjà acceptée"
            message="Cette invitation a déjà été utilisée."
          />
        ) : new Date(invitation.expiresAt).getTime() < Date.now() ? (
          <ErrorState
            title="Invitation expirée"
            message="Demandez à l'administrateur de vous renvoyer une invitation."
          />
        ) : (
          <ActiveInvitation
            token={token}
            email={invitation.email}
            companyName={invitation.companyName}
            session={session}
          />
        )}
      </div>
    </div>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="text-sm text-slate-500">{message}</p>
      <Link href="/" className="btn-secondary mt-2">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

function ActiveInvitation({
  token,
  email,
  companyName,
  session,
}: {
  token: string;
  email: string;
  companyName: string;
  session: Session | null;
}) {
  const sessionEmail = session?.user?.email ?? null;
  const sameEmail =
    !!sessionEmail && sessionEmail.toLowerCase() === email.toLowerCase();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Rejoindre {companyName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Cette invitation est destinée à{" "}
          <span className="font-medium text-slate-900">{email}</span>.
        </p>
      </div>

      {!session ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Connectez-vous avec cette adresse pour accepter l&apos;invitation.
          </p>
          <Link
            href={`/sign-in?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
            className="btn-primary w-full"
          >
            <Mail size={14} />
            Se connecter en tant que {email}
          </Link>
        </div>
      ) : sameEmail ? (
        <AcceptInvitationButton token={token} />
      ) : (
        <div className="space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Vous êtes connecté·e en tant que{" "}
            <span className="font-medium">{sessionEmail}</span>, mais cette
            invitation est destinée à <span className="font-medium">{email}</span>.
          </p>
          <Link
            href={`/api/auth/signout?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
            className="btn-secondary w-full"
          >
            Se déconnecter et réessayer
          </Link>
        </div>
      )}
    </div>
  );
}
