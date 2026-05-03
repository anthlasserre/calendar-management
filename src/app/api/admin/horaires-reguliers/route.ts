import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getRegularHours } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

type IncomingHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

export async function GET() {
  const hours = await getRegularHours();
  return NextResponse.json({ hours });
}

export async function PUT(request: Request) {
  let payload: { hours?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corps de requête JSON invalide." },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.hours) || payload.hours.length !== 7) {
    return NextResponse.json(
      { error: "Le tableau hours doit contenir exactement 7 entrées." },
      { status: 400 },
    );
  }

  const cleaned: IncomingHour[] = [];
  const seen = new Set<number>();

  for (const raw of payload.hours as unknown[]) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        { error: "Entrée d'horaire invalide." },
        { status: 400 },
      );
    }
    const entry = raw as Record<string, unknown>;
    const day = entry.day_of_week;
    const isOpen = entry.is_open;
    const openTime = entry.open_time;
    const closeTime = entry.close_time;

    if (
      typeof day !== "number" ||
      !Number.isInteger(day) ||
      day < 0 ||
      day > 6
    ) {
      return NextResponse.json(
        { error: "day_of_week doit être un entier entre 0 et 6." },
        { status: 400 },
      );
    }
    if (seen.has(day)) {
      return NextResponse.json(
        { error: "Doublon détecté dans les jours." },
        { status: 400 },
      );
    }
    seen.add(day);

    if (typeof isOpen !== "boolean") {
      return NextResponse.json(
        { error: "is_open doit être un booléen." },
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
              "open_time et close_time doivent être au format HH:MM lorsque le jour est ouvert.",
          },
          { status: 400 },
        );
      }
      if (openTime >= closeTime) {
        return NextResponse.json(
          {
            error:
              "L'heure de fermeture doit être strictement après l'heure d'ouverture.",
          },
          { status: 400 },
        );
      }
      cleaned.push({
        day_of_week: day,
        is_open: true,
        open_time: openTime,
        close_time: closeTime,
      });
    } else {
      cleaned.push({
        day_of_week: day,
        is_open: false,
        open_time: null,
        close_time: null,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const h of cleaned) {
      await client.query(
        `UPDATE regular_hours
            SET is_open = $2,
                open_time = $3,
                close_time = $4,
                updated_at = NOW()
          WHERE day_of_week = $1`,
        [h.day_of_week, h.is_open, h.open_time, h.close_time],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const hours = await getRegularHours();
  return NextResponse.json({ hours });
}
