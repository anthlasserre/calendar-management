import { query } from "./db";
import {
  dateMatchesFrequency,
  formatYmd,
  type Holiday,
  type RegularHour,
  type TimeRange,
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
  type TimeRange,
} from "./schedule-types";

type RegularHourJoinRow = {
  day_of_week: number;
  is_open: boolean;
  frequency_weeks: number;
  week_offset: number;
  open_time: string | null;
  close_time: string | null;
};

export async function getRegularHours(
  companyId: number,
): Promise<RegularHour[]> {
  const result = await query<RegularHourJoinRow>(
    `SELECT h.day_of_week,
            h.is_open,
            h.frequency_weeks,
            h.week_offset,
            to_char(r.open_time,  'HH24:MI') AS open_time,
            to_char(r.close_time, 'HH24:MI') AS close_time
       FROM regular_hours h
       LEFT JOIN regular_hour_ranges r
         ON r.company_id = h.company_id AND r.day_of_week = h.day_of_week
      WHERE h.company_id = $1
      ORDER BY h.day_of_week ASC, r.open_time ASC NULLS LAST`,
    [companyId],
  );

  const byDay = new Map<number, RegularHour>();
  for (const row of result.rows) {
    let day = byDay.get(row.day_of_week);
    if (!day) {
      day = {
        day_of_week: row.day_of_week,
        is_open: row.is_open,
        frequency_weeks: row.frequency_weeks,
        week_offset: row.week_offset,
        ranges: [],
      };
      byDay.set(row.day_of_week, day);
    }
    if (row.open_time && row.close_time) {
      day.ranges.push({
        open_time: row.open_time,
        close_time: row.close_time,
      });
    }
  }

  return Array.from(byDay.values()).sort(
    (a, b) => a.day_of_week - b.day_of_week,
  );
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

function pickRangeAt(ranges: TimeRange[], hhmm: string): TimeRange | null {
  for (const r of ranges) {
    if (hhmm >= r.open_time && hhmm < r.close_time) return r;
  }
  return null;
}

function nextRangeAfter(ranges: TimeRange[], hhmm: string): TimeRange | null {
  let best: TimeRange | null = null;
  for (const r of ranges) {
    if (r.open_time > hhmm) {
      if (!best || r.open_time < best.open_time) best = r;
    }
  }
  return best;
}

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
    const day = hours.find((h) => h.day_of_week === dow);
    if (!day || !day.is_open || day.ranges.length === 0) continue;
    if (!dateMatchesFrequency(candidate, day.frequency_weeks, day.week_offset)) {
      continue;
    }

    let candidateRange: TimeRange | null;
    if (i === 0) {
      const hhmm = `${String(reference.getHours()).padStart(2, "0")}:${String(
        reference.getMinutes(),
      ).padStart(2, "0")}`;
      candidateRange = nextRangeAfter(day.ranges, hhmm);
    } else {
      candidateRange = day.ranges.reduce<TimeRange | null>(
        (acc, r) => (!acc || r.open_time < acc.open_time ? r : acc),
        null,
      );
    }
    if (!candidateRange) continue;

    const ymd = formatYmd(candidate);
    const holidayHit = await query<{ id: number }>(
      `SELECT id FROM holidays
        WHERE company_id = $1
          AND $2::date BETWEEN start_date AND end_date
        LIMIT 1`,
      [companyId, ymd],
    );
    if (holidayHit.rows.length > 0) continue;

    return { date: formatYmd(candidate), open_time: candidateRange.open_time };
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

  const dayHours = await getRegularHours(companyId);
  const today = dayHours.find((h) => h.day_of_week === dow);
  const cycleMatches = today
    ? dateMatchesFrequency(date, today.frequency_weeks, today.week_offset)
    : false;

  if (today?.is_open && cycleMatches && today.ranges.length > 0) {
    const active = pickRangeAt(today.ranges, hhmm);
    if (active) {
      return { open: true, closes_at: active.close_time, reason: "regular" };
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
