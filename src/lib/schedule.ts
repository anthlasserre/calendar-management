import { query } from "./db";
import {
  dateMatchesFrequency,
  formatYmd,
  type Holiday,
  type RegularHour,
} from "./schedule-types";

export {
  DAY_LABELS_EN,
  DAY_LABELS_FR,
  DAY_ORDER_FR,
  FREQUENCY_LABELS_FR,
  computeWeekOffsetForDate,
  dateMatchesFrequency,
  formatYmd,
  nextMatchingDate,
  nextOccurrencesOfWeekday,
  type Holiday,
  type RegularHour,
} from "./schedule-types";

export async function getRegularHours(
  companyId: number,
): Promise<RegularHour[]> {
  const result = await query<RegularHour>(
    `SELECT day_of_week, is_open,
            to_char(open_time, 'HH24:MI') AS open_time,
            to_char(close_time, 'HH24:MI') AS close_time,
            frequency_weeks, week_offset
       FROM regular_hours
      WHERE company_id = $1
      ORDER BY day_of_week`,
    [companyId],
  );
  return result.rows;
}

export async function getHolidays(
  companyId: number,
  includePast = false,
): Promise<Holiday[]> {
  const result = await query<Holiday>(
    includePast
      ? `SELECT id, name,
                to_char(start_date, 'YYYY-MM-DD') AS start_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date
           FROM holidays
          WHERE company_id = $1
           ORDER BY start_date DESC`
      : `SELECT id, name,
                to_char(start_date, 'YYYY-MM-DD') AS start_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date
           FROM holidays
          WHERE company_id = $1
            AND end_date >= CURRENT_DATE
           ORDER BY start_date ASC`,
    [companyId],
  );
  return result.rows;
}

export type OpenStatus =
  | { open: true; closes_at: string; reason: "regular" }
  | {
      open: false;
      reason: "regular" | "holiday";
      holiday?: { id: number; name: string; end_date: string };
      next_opening?: { date: string; open_time: string };
    };

async function findNextOpening(
  companyId: number,
  reference: Date,
): Promise<{ date: string; open_time: string } | null> {
  const hours = await getRegularHours(companyId);

  for (let i = 0; i <= 28; i++) {
    const candidate = new Date(
      reference.getFullYear(),
      reference.getMonth(),
      reference.getDate() + i,
    );
    const dow = candidate.getDay();
    const row = hours.find((h) => h.day_of_week === dow);
    if (!row || !row.is_open || !row.open_time || !row.close_time) continue;
    if (!dateMatchesFrequency(candidate, row.frequency_weeks, row.week_offset)) {
      continue;
    }

    if (i === 0) {
      const hhmm = `${String(reference.getHours()).padStart(2, "0")}:${String(
        reference.getMinutes(),
      ).padStart(2, "0")}`;
      if (hhmm >= row.open_time) continue;
    }

    const ymd = formatYmd(candidate);
    const holidayHit = await query<{ id: number }>(
      `SELECT id FROM holidays
        WHERE company_id = $1
          AND $2::date BETWEEN start_date AND end_date
        LIMIT 1`,
      [companyId, ymd],
    );
    if (holidayHit.rows.length > 0) continue;

    return { date: formatYmd(candidate), open_time: row.open_time };
  }

  return null;
}

export async function computeStatusForDate(
  companyId: number,
  date: Date,
): Promise<OpenStatus> {
  const ymd = formatYmd(date);
  const dow = date.getDay();
  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const holidayResult = await query<Holiday>(
    `SELECT id, name,
            to_char(start_date, 'YYYY-MM-DD') AS start_date,
            to_char(end_date, 'YYYY-MM-DD') AS end_date
       FROM holidays
      WHERE company_id = $1
        AND $2::date BETWEEN start_date AND end_date
      ORDER BY start_date ASC
      LIMIT 1`,
    [companyId, ymd],
  );

  if (holidayResult.rows[0]) {
    const holiday = holidayResult.rows[0];
    const next = await findNextOpening(
      companyId,
      new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
    );
    return {
      open: false,
      reason: "holiday",
      holiday: {
        id: holiday.id,
        name: holiday.name,
        end_date: holiday.end_date,
      },
      ...(next ? { next_opening: next } : {}),
    };
  }

  const regularResult = await query<RegularHour>(
    `SELECT day_of_week, is_open,
            to_char(open_time, 'HH24:MI') AS open_time,
            to_char(close_time, 'HH24:MI') AS close_time,
            frequency_weeks, week_offset
       FROM regular_hours
      WHERE company_id = $1 AND day_of_week = $2`,
    [companyId, dow],
  );

  const today = regularResult.rows[0];
  const cycleMatches = today
    ? dateMatchesFrequency(date, today.frequency_weeks, today.week_offset)
    : false;

  if (today?.is_open && today.open_time && today.close_time && cycleMatches) {
    if (hhmm >= today.open_time && hhmm < today.close_time) {
      return { open: true, closes_at: today.close_time, reason: "regular" };
    }
  }

  const next = await findNextOpening(companyId, date);
  return {
    open: false,
    reason: "regular",
    ...(next ? { next_opening: next } : {}),
  };
}

export async function getCurrentOrUpcomingHoliday(
  companyId: number,
  withinDays = 15,
  reference: Date = new Date(),
): Promise<Holiday | null> {
  const ymd = formatYmd(reference);
  const result = await query<Holiday>(
    `SELECT id, name,
            to_char(start_date, 'YYYY-MM-DD') AS start_date,
            to_char(end_date, 'YYYY-MM-DD') AS end_date
       FROM holidays
      WHERE company_id = $1
        AND end_date >= $2::date
        AND start_date <= $2::date + ($3::int || ' days')::interval
      ORDER BY start_date ASC
      LIMIT 1`,
    [companyId, ymd, withinDays],
  );
  return result.rows[0] ?? null;
}
