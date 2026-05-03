import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { signOutAction } from "./actions";

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
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Horaires du bureau
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {user.companyName ?? "Votre entreprise"} ·{" "}
            <span className="text-slate-400">{user.email}</span>
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Horaires
          </Link>
          <Link
            href="/embeds"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Widgets
          </Link>
          <Link
            href="/settings"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Paramètres
          </Link>
          <a
            href={`/c/${user.companySlug}/api/schedule`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            API publique
          </a>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Se déconnecter
            </button>
          </form>
        </nav>
      </header>
      {children}
      <footer className="mt-16 border-t border-slate-200 pt-6 text-xs text-slate-400">
        Toutes les heures sont enregistrées et affichées dans le fuseau
        horaire de Paris.
      </footer>
    </div>
  );
}
