import { computeStatusForDate } from "@/lib/schedule";
import { Clock, CalendarRange } from "@/components/icons";

export async function CurrentStatus({ companyId }: { companyId: number }) {
  const now = new Date();
  const status = await computeStatusForDate(companyId, now);

  const dateFmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeFmt = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let title: string;
  let detail: string;
  let nextLine: string | null = null;
  let tone: "open" | "closed";

  if (status.open) {
    tone = "open";
    title = "Bureau ouvert";
    detail = `Fermeture aujourd'hui à ${status.closes_at}`;
  } else if (status.reason === "holiday" && status.holiday) {
    tone = "closed";
    title = "Bureau fermé";
    const endFormatter = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDate = new Date(`${status.holiday.end_date}T00:00:00`);
    detail = `${status.holiday.name} — jusqu'au ${endFormatter.format(endDate)}`;
  } else {
    tone = "closed";
    title = "Bureau fermé";
    detail = "Hors des horaires d'ouverture habituels";
  }

  if (!status.open && status.next_opening) {
    const dateLabel = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(`${status.next_opening.date}T00:00:00`));
    nextLine = `Prochaine ouverture : ${dateLabel} à ${status.next_opening.open_time}`;
  }

  return (
    <section
      className={
        "relative overflow-hidden rounded-3xl border p-6 shadow-soft sm:p-8 " +
        (tone === "open"
          ? "border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
          : "border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-white")
      }
    >
      <div
        aria-hidden
        className={
          "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl " +
          (tone === "open" ? "bg-emerald-200/60" : "bg-brand-200/40")
        }
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={
              "relative flex h-12 w-12 items-center justify-center rounded-2xl " +
              (tone === "open"
                ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-[0_10px_30px_-10px_rgba(100,116,139,0.45)]")
            }
          >
            <Clock size={20} />
            {tone === "open" && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
              </span>
            )}
          </div>
          <div>
            <p className="section-eyebrow">Statut en direct</p>
            <h2
              className={
                "mt-1 text-2xl font-semibold tracking-tight " +
                (tone === "open" ? "text-emerald-900" : "text-slate-900")
              }
            >
              {title}
            </h2>
            <p
              className={
                "mt-1 text-sm " +
                (tone === "open" ? "text-emerald-800/80" : "text-slate-500")
              }
            >
              {detail}
            </p>
            {nextLine && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarRange size={12} />
                {nextLine}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1 text-xs uppercase tracking-wide text-slate-400 sm:items-end">
          <span>{dateFmt.format(now)}</span>
          <span className="font-mono text-base text-slate-700">
            {timeFmt.format(now)}
          </span>
        </div>
      </div>
    </section>
  );
}
