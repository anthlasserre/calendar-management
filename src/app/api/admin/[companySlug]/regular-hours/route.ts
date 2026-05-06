import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getRegularHours } from "@/lib/schedule";
import { requireCompanyContext } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_FREQUENCY_WEEKS = 4;

type IncomingRange = { open_time: string; close_time: string };

type IncomingDay = {
  day_of_week: number;
  is_open: boolean;
  frequency_weeks: number;
  week_offset: number;
  ranges: IncomingRange[];
};

type RouteContext = { params: Promise<{ companySlug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { companySlug } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;
  const hours = await getRegularHours(auth.company.id);
  return NextResponse.json({ hours });
}

export async function PUT(request: Request, context: RouteContext) {
  const { companySlug } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;
  const companyId = auth.company.id;

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

  const cleaned: IncomingDay[] = [];
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
    const rangesRaw = entry.ranges;
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
      if (!Array.isArray(rangesRaw) || rangesRaw.length === 0) {
        return NextResponse.json(
          { error: "ranges must be a non-empty array when the day is open." },
          { status: 400 },
        );
      }
      const ranges: IncomingRange[] = [];
      for (const r of rangesRaw) {
        if (!r || typeof r !== "object") {
          return NextResponse.json(
            { error: "Invalid range entry." },
            { status: 400 },
          );
        }
        const rec = r as Record<string, unknown>;
        const ot = rec.open_time;
        const ct = rec.close_time;
        if (
          typeof ot !== "string" ||
          typeof ct !== "string" ||
          !TIME_REGEX.test(ot) ||
          !TIME_REGEX.test(ct)
        ) {
          return NextResponse.json(
            { error: "open_time and close_time must use the HH:MM format." },
            { status: 400 },
          );
        }
        if (ot >= ct) {
          return NextResponse.json(
            { error: "close_time must be strictly after open_time." },
            { status: 400 },
          );
        }
        ranges.push({ open_time: ot, close_time: ct });
      }
      ranges.sort((a, b) => a.open_time.localeCompare(b.open_time));
      for (let i = 1; i < ranges.length; i++) {
        if (ranges[i].open_time < ranges[i - 1].close_time) {
          return NextResponse.json(
            { error: "Ranges on the same day must not overlap." },
            { status: 400 },
          );
        }
      }
      cleaned.push({
        day_of_week: day,
        is_open: true,
        frequency_weeks: frequency,
        week_offset: offset,
        ranges,
      });
    } else {
      cleaned.push({
        day_of_week: day,
        is_open: false,
        frequency_weeks: 1,
        week_offset: 0,
        ranges: [],
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const h of cleaned) {
      await client.query(
        `INSERT INTO regular_hours
            (company_id, day_of_week, is_open, frequency_weeks, week_offset)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, day_of_week) DO UPDATE
            SET is_open = EXCLUDED.is_open,
                frequency_weeks = EXCLUDED.frequency_weeks,
                week_offset = EXCLUDED.week_offset,
                updated_at = NOW()`,
        [
          companyId,
          h.day_of_week,
          h.is_open,
          h.frequency_weeks,
          h.week_offset,
        ],
      );
    }
    await client.query(
      `DELETE FROM regular_hour_ranges WHERE company_id = $1`,
      [companyId],
    );
    for (const h of cleaned) {
      if (!h.is_open) continue;
      for (const r of h.ranges) {
        await client.query(
          `INSERT INTO regular_hour_ranges
              (company_id, day_of_week, open_time, close_time)
           VALUES ($1, $2, $3, $4)`,
          [companyId, h.day_of_week, r.open_time, r.close_time],
        );
      }
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
