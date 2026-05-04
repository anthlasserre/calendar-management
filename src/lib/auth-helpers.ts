import { auth } from "@/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";

export async function getSessionWithCompany(): Promise<{
  session: Session;
  companyId: number;
} | null> {
  const session = await auth();
  if (!session?.user?.companyId) return null;
  return { session, companyId: session.user.companyId };
}

export async function requireApiCompany(): Promise<
  | { ok: true; session: Session; companyId: number }
  | { ok: false; response: NextResponse }
> {
  const ctx = await getSessionWithCompany();
  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }
  return { ok: true, ...ctx };
}
