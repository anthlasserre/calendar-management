import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const result = await query(`DELETE FROM holidays WHERE id = $1`, [numericId]);
  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Période introuvable." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
