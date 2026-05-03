import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiCompany } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const result = await query(
    `DELETE FROM holidays WHERE id = $1 AND company_id = $2`,
    [numericId, auth.companyId],
  );
  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Closure not found." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
