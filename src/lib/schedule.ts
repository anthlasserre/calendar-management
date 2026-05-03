import { query } from "./db";
import {
  type Holiday,
  type RegularHour,
} from "./schedule-types";

export {
  DAY_LABELS_FR,
  DAY_ORDER_FR,
  type Holiday,
  type RegularHour,
} from "./schedule-types";

export async function getRegularHours(): Promise<RegularHour[]> {
  const result = await query<RegularHour>(
    `SELECT day_of_week, is_open,
            to_char(open_time, 'HH24:MI') AS open_time,
            to_char(close_time, 'HH24:MI') AS close_time
       FROM regular_hours
       ORDER BY day_of_week`,
  );
  return result.rows;
}

export async function getHolidays(includePast = false): Promise<Holiday[]> {
  const result = await query<Holiday>(
    includePast
      ? `SELECT id, name,
                to_char(start_date, 'YYYY-MM-DD') AS start_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date
           FROM holidays
           ORDER BY start_date DESC`
      : `SELECT id, name,
                to_char(start_date, 'YYYY-MM-DD') AS start_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date
           FROM holidays
           WHERE end_date >= CURRENT_DATE
           ORDER BY start_date ASC`,
  );
  return result.rows;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type OpenStatus =
  | { open: true; closes_at: string; reason: "regular" }
  | {
      open: false;
      reason: "regular" | "holiday";
      holiday?: { id: number; name: string; end_date: string };
      next_opening?: { date: string; open_time: string };
    };

export async function computeStatusForDate(date: Date): Promise<OpenStatus> {
  const ymd = formatYmd(date);
  const dow = date.getDay();
  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const holidayResult = await query<Holiday>(
    `SELECT id, name,
            to_char(start_date, 'YYYY-MM-DD') AS start_date,
            to_char(end_date, 'YYYY-MM-DD') AS end_date
       FROM holidays
      WHERE $1::date BETWEEN start_date AND end_date
      ORDER BY start_date ASC
      LIMIT 1`,
    [ymd],
  );

  if (holidayResult.rows[0]) {
    const holiday = holidayResult.rows[0];
    return {
      open: false,
      reason: "holiday",
      holiday: {
        id: holiday.id,
        name: holiday.name,
        end_date: holiday.end_date,
      },
    };
  }

  const regularResult = await query<RegularHour>(
    `SELECT day_of_week, is_open,
            to_char(open_time, 'HH24:MI') AS open_time,
            to_char(close_time, 'HH24:MI') AS close_time
       FROM regular_hours
      WHERE day_of_week = $1`,
    [dow],
  );

  const today = regularResult.rows[0];
  if (today?.is_open && today.open_time && today.close_time) {
    if (hhmm >= today.open_time && hhmm < today.close_time) {
      return { open: true, closes_at: today.close_time, reason: "regular" };
    }
  }

  return { open: false, reason: "regular" };
}
