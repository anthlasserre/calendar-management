import { NextResponse } from "next/server";
import { requireApiCompany } from "@/lib/auth-helpers";
import { getCompanyById } from "@/lib/companies";
import {
  createOrRefreshInvitation,
  listPendingInvitations,
} from "@/lib/invitations";
import { renderInvitationEmail, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function buildInviteUrl(token: string): string {
  const base =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export async function GET() {
  const auth = await requireApiCompany();
  if (!auth.ok) return auth.response;
  const invitations = await listPendingInvitations(auth.companyId);
  // Hide raw tokens from the listing — only the email + dates are useful in the UI.
  const safe = invitations.map(({ token: _token, ...rest }) => rest);
  return NextResponse.json({ invitations: safe });
}

export async function POST(request: Request) {
  const auth = await requireApiCompany();
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

  const company = await getCompanyById(auth.companyId);
  if (!company) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  let invitation;
  try {
    invitation = await createOrRefreshInvitation({
      companyId: auth.companyId,
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
    companyName: company.name,
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

  // Strip the raw token from the response.
  const { token: _token, ...safe } = invitation;
  return NextResponse.json({ invitation: safe }, { status: 201 });
}
