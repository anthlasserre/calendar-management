import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyById } from "@/lib/companies";
import { CompanySettingsForm } from "@/components/CompanySettingsForm";
import { Settings as SettingsIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.companyId) {
    redirect("/sign-in");
  }
  const company = await getCompanyById(session.user.companyId);
  if (!company) {
    redirect("/sign-in");
  }

  return (
    <main className="space-y-8">
      <section className="surface-card p-6 sm:p-8">
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <SettingsIcon size={18} />
          </span>
          <div>
            <p className="section-eyebrow">Entreprise</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Paramètres
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Le slug détermine l&apos;URL publique des widgets et de
              l&apos;API. Modifiez-le avec précaution si des intégrations
              existantes en dépendent.
            </p>
          </div>
        </header>
        <CompanySettingsForm initialCompany={company} />
      </section>
    </main>
  );
}
