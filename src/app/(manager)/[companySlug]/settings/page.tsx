import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyBySlug, userBelongsToCompany } from "@/lib/companies";
import { CompanySettingsForm } from "@/components/CompanySettingsForm";
import { Settings as SettingsIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug);
  if (!company) notFound();
  const allowed = await userBelongsToCompany(
    Number(session.user.id),
    company.id,
  );
  if (!allowed) notFound();

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
        <CompanySettingsForm
          companySlug={company.slug}
          initialCompany={company}
        />
      </section>
    </main>
  );
}
