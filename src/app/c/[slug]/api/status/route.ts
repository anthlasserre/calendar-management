import { NextResponse } from "next/server";
import { computeStatusForDate } from "@/lib/schedule";
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
  request: Request,
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

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  let target: Date;
  if (dateParam) {
    const parsed = new Date(dateParam);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        {
          error:
            "Invalid date parameter. Use an ISO 8601 value, e.g. 2026-05-03T14:30.",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    target = parsed;
  } else {
    target = new Date();
  }

  const status = await computeStatusForDate(company.id, target);

  return NextResponse.json(
    {
      company: { slug: company.slug, name: company.name },
      checked_at: target.toISOString(),
      timezone: company.timezone,
      ...status,
    },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    },
  );
}
