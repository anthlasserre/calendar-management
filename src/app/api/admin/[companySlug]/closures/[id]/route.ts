import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireCompanyContext } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ companySlug: string; id: string }> },
) {
  const { companySlug, id } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const result = await query(
    `DELETE FROM holidays WHERE id = $1 AND company_id = $2`,
    [numericId, auth.company.id],
  );
  if (result.rowCount === 0) {
    return NextResponse.json(
      { error: "Closure not found." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
