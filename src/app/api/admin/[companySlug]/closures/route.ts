import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getHolidays, type Holiday } from "@/lib/schedule";
import { requireApiCompany } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const includePast = searchParams.get("include_past") === "true";
  const closures = await getHolidays(auth.companyId, includePast);
  return NextResponse.json({ closures });
}

export async function POST(request: Request) {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;

  let payload: { name?: unknown; start_date?: unknown; end_date?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const startDate =
    typeof payload.start_date === "string" ? payload.start_date : "";
  const endDate = typeof payload.end_date === "string" ? payload.end_date : "";

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
    return NextResponse.json(
      { error: "start_date and end_date must use the YYYY-MM-DD format." },
      { status: 400 },
    );
  }
  if (startDate > endDate) {
    return NextResponse.json(
      { error: "end_date must be on or after start_date." },
      { status: 400 },
    );
  }

  const result = await query<Holiday>(
    `INSERT INTO holidays (company_id, name, start_date, end_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name,
               to_char(start_date, 'YYYY-MM-DD') AS start_date,
               to_char(end_date,   'YYYY-MM-DD') AS end_date`,
    [auth.companyId, name, startDate, endDate],
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
