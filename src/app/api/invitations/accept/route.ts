import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { acceptInvitation, InvitationError } from "@/lib/invitations";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let payload: { token?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof payload.token !== "string" || !payload.token) {
    return NextResponse.json({ error: "token required." }, { status: 400 });
  }

  try {
    const { companyId } = await acceptInvitation({
      token: payload.token,
      userId: Number(session.user.id),
      userEmail: session.user.email,
    });
    return NextResponse.json({ ok: true, companyId });
  } catch (error) {
    if (error instanceof InvitationError) {
      const status =
        error.code === "not_found"
          ? 404
          : error.code === "email_mismatch"
            ? 403
            : 410;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    throw error;
  }
}
