import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHolidays, getRegularHours } from "@/lib/schedule";
import { RegularHoursEditor } from "@/components/RegularHoursEditor";
import { HolidaysManager } from "@/components/HolidaysManager";
import { CurrentStatus } from "@/components/CurrentStatus";

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

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Horaires d&apos;ouverture habituels
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Définissez les jours et plages horaires pendant lesquels le
              bureau est ouvert chaque semaine.
            </p>
          </div>
        </header>
        <RegularHoursEditor initialHours={regularHours} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
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
