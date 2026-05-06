import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getCompanyBySlug,
  listCompaniesForUser,
  setCurrentCompany,
  userBelongsToCompany,
} from "@/lib/companies";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { signOutAction } from "./actions";
import {
  Clock,
  LinkChain,
  LogOut,
  Settings as SettingsIcon,
  Sparkles,
  Users,
} from "@/components/icons";

export default async function ManagerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);
  if (!company) notFound();

  const userId = Number(session.user.id);
  const allowed = await userBelongsToCompany(userId, company.id);
  if (!allowed) notFound();

  const memberships = await listCompaniesForUser(userId);
  // Stick the visited company as the user's "current" one for next sign-in.
  await setCurrentCompany(userId, company.id);

  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CompanySwitcher
            current={company}
            memberships={memberships}
            userEmail={session.user.email ?? null}
          />
          <nav className="flex flex-wrap items-center gap-1.5">
            <Link href={`/${company.slug}`} className="btn-ghost">
              <Clock size={14} /> Horaires
            </Link>
            <Link href={`/${company.slug}/embeds`} className="btn-ghost">
              <Sparkles size={14} /> Widgets
            </Link>
            <Link href={`/${company.slug}/team`} className="btn-ghost">
              <Users size={14} /> Équipe
            </Link>
            <Link href={`/${company.slug}/settings`} className="btn-ghost">
              <SettingsIcon size={14} /> Paramètres
            </Link>
            <a
              href={`/c/${company.slug}/api/schedule`}
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
