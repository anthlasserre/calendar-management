import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHolidays, getRegularHours } from "@/lib/schedule";
import { RegularHoursEditor } from "@/components/RegularHoursEditor";
import { HolidaysManager } from "@/components/HolidaysManager";
import { CurrentStatus } from "@/components/CurrentStatus";
import { Clock, CalendarRange } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const companyId = session?.user?.companyId;
  if (!companyId) {
    redirect("/sign-in");
  }

  const [regularHours, holidays] = await Promise.all([
    getRegularHours(companyId),
    getHolidays(companyId, false),
  ]);

  return (
    <main className="space-y-10">
      <CurrentStatus companyId={companyId} />

      <section className="surface-card p-6 sm:p-8">
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Clock size={18} />
          </span>
          <div>
            <p className="section-eyebrow">Hebdomadaire</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Horaires d&apos;ouverture habituels
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Définissez les jours et plages horaires pendant lesquels le
              bureau est ouvert chaque semaine, avec une récurrence optionnelle
              (toutes les semaines, une semaine sur deux, etc.).
            </p>
          </div>
        </header>
        <RegularHoursEditor initialHours={regularHours} />
      </section>

      <section className="surface-card p-6 sm:p-8">
        <header className="mb-6 flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CalendarRange size={18} />
          </span>
          <div>
            <p className="section-eyebrow">Exceptionnel</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Périodes de fermeture
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez les vacances, jours fériés et autres périodes pendant
              lesquelles le bureau sera fermé.
            </p>
          </div>
        </header>
        <HolidaysManager initialHolidays={holidays} />
      </section>
    </main>
  );
}
