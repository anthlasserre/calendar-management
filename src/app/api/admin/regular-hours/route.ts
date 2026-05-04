import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getRegularHours } from "@/lib/schedule";
import { requireApiCompany } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_FREQUENCY_WEEKS = 4;

type IncomingHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  frequency_weeks: number;
  week_offset: number;
};

export async function GET() {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;
  const hours = await getRegularHours(auth.companyId);
  return NextResponse.json({ hours });
}

export async function PUT(request: Request) {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;
  const companyId = auth.companyId;

  let payload: { hours?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.hours) || payload.hours.length !== 7) {
    return NextResponse.json(
      { error: "hours must contain exactly 7 entries." },
      { status: 400 },
    );
  }

  const cleaned: IncomingHour[] = [];
  const seen = new Set<number>();

  for (const raw of payload.hours as unknown[]) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "Invalid schedule entry." },
        { status: 400 },
      );
    }
    const entry = raw as Record<string, unknown>;
    const day = entry.day_of_week;
    const isOpen = entry.is_open;
    const openTime = entry.open_time;
    const closeTime = entry.close_time;
    const frequency = entry.frequency_weeks ?? 1;
    const offset = entry.week_offset ?? 0;

    if (
      typeof day !== "number" ||
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6
    ) {
      return NextResponse.json(
        { error: "day_of_week must be an integer between 0 and 6." },
        { status: 400 },
      );
    }
    if (seen.has(day)) {
      return NextResponse.json(
        { error: "Duplicate day_of_week value." },
        { status: 400 },
      );
    }
    seen.add(day);

    if (typeof isOpen !== "boolean") {
      return NextResponse.json(
        { error: "is_open must be a boolean." },
        { status: 400 },
      );
    }

    if (
      typeof frequency !== "number" ||
      !Number.isInteger(frequency) ||
      frequency < 1 ||
      frequency > MAX_FREQUENCY_WEEKS
    ) {
      return NextResponse.json(
        {
          error: `frequency_weeks must be an integer between 1 and ${MAX_FREQUENCY_WEEKS}.`,
        },
        { status: 400 },
      );
    }
    if (
      typeof offset !== "number" ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset >= frequency
    ) {
      return NextResponse.json(
        { error: "week_offset must be an integer in [0, frequency_weeks)." },
        { status: 400 },
      );
    }

    if (isOpen) {
      if (
        typeof openTime !== "string" ||
        typeof closeTime !== "string" ||
        !TIME_REGEX.test(openTime) ||
        !TIME_REGEX.test(closeTime)
      ) {
        return NextResponse.json(
          {
            error:
              "open_time and close_time must use the HH:MM format when the day is open.",
          },
          { status: 400 },
        );
      }
      if (openTime >= closeTime) {
        return NextResponse.json(
          { error: "close_time must be strictly after open_time." },
          { status: 400 },
        );
      }
      cleaned.push({
        day_of_week: day,
        is_open: true,
        open_time: openTime,
        close_time: closeTime,
        frequency_weeks: frequency,
        week_offset: offset,
      });
    } else {
      cleaned.push({
        day_of_week: day,
        is_open: false,
        open_time: null,
        close_time: null,
        frequency_weeks: 1,
        week_offset: 0,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const h of cleaned) {
      await client.query(
        `INSERT INTO regular_hours
            (company_id, day_of_week, is_open, open_time, close_time, frequency_weeks, week_offset)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (company_id, day_of_week) DO UPDATE
            SET is_open = EXCLUDED.is_open,
                open_time = EXCLUDED.open_time,
                close_time = EXCLUDED.close_time,
                frequency_weeks = EXCLUDED.frequency_weeks,
                week_offset = EXCLUDED.week_offset,
                updated_at = NOW()`,
        [
          companyId,
          h.day_of_week,
          h.is_open,
          h.open_time,
          h.close_time,
          h.frequency_weeks,
          h.week_offset,
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const hours = await getRegularHours(companyId);
  return NextResponse.json({ hours });
}
