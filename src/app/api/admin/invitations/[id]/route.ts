import { NextResponse } from "next/server";
import { requireApiCompany } from "@/lib/auth-helpers";
import { revokeInvitation } from "@/lib/invitations";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const ok = await revokeInvitation(id, auth.companyId);
  if (!ok) {
    return NextResponse.json({ error: "Invitation not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
