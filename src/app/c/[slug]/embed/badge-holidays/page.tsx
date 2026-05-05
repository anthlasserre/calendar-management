import { notFound } from "next/navigation";
import {
  computeStatusForDate,
  getCurrentOrUpcomingHoliday,
  type Holiday,
} from "@/lib/schedule";
import { getCompanyBySlug } from "@/lib/companies";
import { StatusBadge } from "@/components/StatusBadge";
import { EmbedAlign } from "@/components/EmbedAlign";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

const DATE_FORMATTER_LONG = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (start === end) return DATE_FORMATTER_LONG.format(s);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sFormatted = sameYear ? DATE_FORMATTER.format(s) : DATE_FORMATTER_LONG.format(s);
  return `${sFormatted} → ${DATE_FORMATTER_LONG.format(e)}`;
}

function buildHolidayLine(holiday: Holiday, today: Date): string {
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isCurrent =
    holiday.start_date <= todayYmd && holiday.end_date >= todayYmd;
  const range = formatRange(holiday.start_date, holiday.end_date);
  if (isCurrent) {
    return `Fermeture en cours : ${holiday.name} (${range})`;
  }
  return `Prochaine fermeture : ${holiday.name} (${range})`;
}

export default async function EmbedBadgeHolidaysPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ align?: string }>;
}) {
  const [{ slug }, { align }] = await Promise.all([params, searchParams]);
  const company = await getCompanyBySlug(slug);
  if (!company) notFound();
  const now = new Date();
  const [status, holiday] = await Promise.all([
    computeStatusForDate(company.id, now),
    getCurrentOrUpcomingHoliday(company.id, 15, now),
  ]);

  return (
    <EmbedAlign align={align}>
      <div className="inline-flex max-w-md flex-col items-start gap-2">
        <StatusBadge status={status} />
        {holiday ? (
          <p className="text-xs leading-relaxed text-slate-600">
            {buildHolidayLine(holiday, now)}
          </p>
        ) : (
          <p className="text-xs italic leading-relaxed text-slate-400">
            Aucune fermeture prévue dans les 15 prochains jours.
          </p>
        )}
      </div>
    </EmbedAlign>
  );
}
