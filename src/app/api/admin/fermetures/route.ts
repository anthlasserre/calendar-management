import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getHolidays, type Holiday } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includePast = searchParams.get("inclure_passees") === "true";
  const holidays = await getHolidays(includePast);
  return NextResponse.json({ holidays });
}

export async function POST(request: Request) {
  let payload: { name?: unknown; start_date?: unknown; end_date?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 },
    );
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const startDate =
    typeof payload.start_date === "string" ? payload.start_date : "";
  const endDate = typeof payload.end_date === "string" ? payload.end_date : "";

  if (!name) {
    return NextResponse.json(
      { error: "Le nom est requis." },
      { status: 400 },
    );
  }
  if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
    return NextResponse.json(
      { error: "Les dates doivent être au format AAAA-MM-JJ." },
      { status: 400 },
    );
  }
  if (startDate > endDate) {
    return NextResponse.json(
      { error: "La date de fin doit être postérieure ou égale à la date de début." },
      { status: 400 },
    );
  }

  const result = await query<Holiday>(
    `INSERT INTO holidays (name, start_date, end_date)
     VALUES ($1, $2, $3)
     RETURNING id, name,
               to_char(start_date, 'YYYY-MM-DD') AS start_date,
               to_char(end_date,   'YYYY-MM-DD') AS end_date`,
    [name, startDate, endDate],
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}
