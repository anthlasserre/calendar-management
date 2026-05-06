import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "./actions";
import {
  Building,
  Clock,
  LinkChain,
  LogOut,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from "@/components/icons";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.companyId || !session.user.companySlug) {
    redirect("/sign-in");
  }
  const { user } = session;

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-lift">
              <Building size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Horaires du bureau
              </p>
              <p className="text-xs text-slate-500">
                {user.companyName ?? "Votre entreprise"}
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-slate-400">{user.email}</span>
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1.5">
            <Link href="/" className="btn-ghost">
              <Clock size={14} /> Horaires
            </Link>
            <Link href="/embeds" className="btn-ghost">
              <Sparkles size={14} /> Widgets
            </Link>
            <Link href="/team" className="btn-ghost">
              <Users size={14} /> Équipe
            </Link>
            <Link href="/settings" className="btn-ghost">
              <SettingsIcon size={14} /> Paramètres
            </Link>
            <a
              href={`/c/${user.companySlug}/api/schedule`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
            >
              <LinkChain size={14} /> API publique
            </a>
            <form action={signOutAction}>
              <button type="submit" className="btn-ghost text-slate-500">
                <LogOut size={14} /> Se déconnecter
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {children}
        <footer className="mt-16 border-t border-slate-200/70 pt-6 text-xs text-slate-400">
          Toutes les heures sont enregistrées et affichées dans le fuseau
          horaire de Paris.
        </footer>
      </div>
    </div>
  );
}
