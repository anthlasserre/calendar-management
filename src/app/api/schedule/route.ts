import { NextResponse } from "next/server";
import {
  DAY_LABELS_EN,
  formatYmd,
  getHolidays,
  getRegularHours,
  nextMatchingDate,
} from "@/lib/schedule";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const [hours, closures] = await Promise.all([
    getRegularHours(),
    getHolidays(false),
  ]);

  const now = new Date();

  const regular = hours.map((h) => {
    const next =
      h.is_open && h.frequency_weeks > 1
        ? nextMatchingDate(
            h.day_of_week,
            h.frequency_weeks,
            h.week_offset,
            now,
          )
        : null;
    return {
      day_of_week: h.day_of_week,
      day_label: DAY_LABELS_EN[h.day_of_week],
      is_open: h.is_open,
      open_time: h.open_time,
      close_time: h.close_time,
      frequency_weeks: h.frequency_weeks,
      week_offset: h.week_offset,
      next_occurrence: next ? formatYmd(next) : null,
    };
  });

  return NextResponse.json(
    {
      timezone: process.env.TZ ?? "Europe/Paris",
      regular_hours: regular,
      upcoming_closures: closures,
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
