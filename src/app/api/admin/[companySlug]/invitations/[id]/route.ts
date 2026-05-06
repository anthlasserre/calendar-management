import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth-helpers";
import { revokeInvitation } from "@/lib/invitations";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ companySlug: string; id: string }> },
) {
  const { companySlug, id: rawId } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;

  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const ok = await revokeInvitation(id, auth.company.id);
  if (!ok) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
