import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyById } from "@/lib/companies";
import { CompanySettingsForm } from "@/components/CompanySettingsForm";

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
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Paramètres de l&apos;entreprise
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Le slug détermine l&apos;URL publique des widgets et de l&apos;API.
            Modifiez-le avec précaution si des intégrations existantes en
            dépendent.
          </p>
        </header>
        <CompanySettingsForm initialCompany={company} />
      </section>
    </main>
  );
}
