import Link from "next/link";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Horaires du bureau
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gérez les jours et heures d&apos;ouverture ainsi que les périodes
            de fermeture exceptionnelles.
          </p>
        </div>
        <nav className="flex items-center gap-2">
          <Link
            href="/embeds"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Widgets
          </Link>
          <a
            href="/api/horaires"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            API publique
          </a>
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
