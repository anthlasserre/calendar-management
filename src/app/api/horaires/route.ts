import { NextResponse } from "next/server";
import {
  DAY_LABELS_FR,
  getHolidays,
  getRegularHours,
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
  const [hours, holidays] = await Promise.all([
    getRegularHours(),
    getHolidays(false),
  ]);

  const regular = hours.map((h) => ({
    day_of_week: h.day_of_week,
    day_label: DAY_LABELS_FR[h.day_of_week],
    is_open: h.is_open,
    open_time: h.open_time,
    close_time: h.close_time,
  }));

  return NextResponse.json(
    {
      timezone: process.env.TZ ?? "Europe/Paris",
      regular_hours: regular,
      upcoming_closures: holidays,
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
