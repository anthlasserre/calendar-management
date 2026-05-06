import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth-helpers";
import {
  createOrRefreshInvitation,
  listPendingInvitations,
} from "@/lib/invitations";
import { renderInvitationEmail, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ companySlug: string }> };

function buildInviteUrl(token: string): string {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { companySlug } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;
  const invitations = await listPendingInvitations(auth.company.id);
  const safe = invitations.map(({ token: _token, ...rest }) => rest);
  return NextResponse.json({ invitations: safe });
}

export async function POST(request: Request, context: RouteContext) {
  const { companySlug } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;

  let payload: { email?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.email !== "string" || !payload.email.trim()) {
    return NextResponse.json(
      { error: "email must be a non-empty string." },
      { status: 400 },
    );
  }

  let invitation;
  try {
    invitation = await createOrRefreshInvitation({
      companyId: auth.company.id,
      email: payload.email.trim(),
      invitedBy: Number(auth.session.user.id),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }

  const url = buildInviteUrl(invitation.token);
  const { subject, html, text } = renderInvitationEmail({
    url,
    companyName: auth.company.name,
    inviterEmail: auth.session.user.email ?? null,
  });
  try {
    await sendEmail({ to: invitation.email, subject, html, text });
  } catch (error) {
    return NextResponse.json(
      { error: `Email delivery failed: ${(error as Error).message}` },
      { status: 502 },
    );
  }

  const { token: _token, ...safe } = invitation;
  return NextResponse.json({ invitation: safe }, { status: 201 });
}
