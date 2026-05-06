import { NextResponse } from "next/server";
import {
  DAY_LABELS_EN,
  formatYmd,
  getHolidays,
  getRegularHours,
  nextMatchingDate,
} from "@/lib/schedule";
import { getCompanyBySlug } from "@/lib/companies";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const company = await getCompanyBySlug(slug);
  if (!company) {
    return NextResponse.json(
      { error: "Unknown company." },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  const [hours, closures] = await Promise.all([
    getRegularHours(company.id),
    getHolidays(company.id, false),
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
      ranges: h.ranges,
      frequency_weeks: h.frequency_weeks,
      week_offset: h.week_offset,
      next_occurrence: next ? formatYmd(next) : null,
    };
  });

  return NextResponse.json(
    {
      company: { slug: company.slug, name: company.name },
      timezone: company.timezone,
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
