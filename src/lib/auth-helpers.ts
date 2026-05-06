import { auth } from "@/auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import {
  getCompanyBySlug,
  userBelongsToCompany,
  type Company,
} from "@/lib/companies";

export async function requireCompanyContext(companySlug: string): Promise<
  | { ok: true; session: Session; company: Company }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const company = await getCompanyBySlug(companySlug);
  if (!company) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Company not found." },
        { status: 404 },
      ),
    };
  }

  const userId = Number(session.user.id);
  const allowed = await userBelongsToCompany(userId, company.id);
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return { ok: true, session, company };
}
