import { computeStatusForDate } from "@/lib/schedule";

export async function CurrentStatus() {
  const now = new Date();
  const status = await computeStatusForDate(now);

  const formatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  let title: string;
  let detail: string;
  let tone: "open" | "closed";

  if (status.open) {
    tone = "open";
    title = "Bureau ouvert";
    detail = `Fermeture aujourd'hui à ${status.closes_at}.`;
  } else if (status.reason === "holiday" && status.holiday) {
    tone = "closed";
    title = "Bureau fermé";
    const endFormatter = new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const endDate = new Date(`${status.holiday.end_date}T00:00:00`);
    detail = `Période : ${status.holiday.name} (jusqu'au ${endFormatter.format(endDate)}).`;
  } else {
    tone = "closed";
    title = "Bureau fermé";
    detail = "Hors des horaires d'ouverture habituels.";
  }

  return (
    <section
      className={
        tone === "open"
          ? "rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
          : "rounded-2xl border border-slate-200 bg-white p-5"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={
              tone === "open"
                ? "inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"
                : "inline-block h-2.5 w-2.5 rounded-full bg-slate-400"
            }
            aria-hidden
          />
          <div>
            <p
              className={
                tone === "open"
                  ? "text-base font-semibold text-emerald-900"
                  : "text-base font-semibold text-slate-800"
              }
            >
              {title}
            </p>
            <p
              className={
                tone === "open"
                  ? "text-sm text-emerald-800/80"
                  : "text-sm text-slate-500"
              }
            >
              {detail}
            </p>
          </div>
        </div>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {formatter.format(now)}
        </p>
      </div>
    </section>
  );
}
