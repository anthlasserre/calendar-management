import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth-helpers";
import { updateCompany } from "@/lib/companies";

export const dynamic = "force-dynamic";

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

type RouteContext = { params: Promise<{ companySlug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { companySlug } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ company: auth.company });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { companySlug } = await context.params;
  const auth = await requireCompanyContext(companySlug);
  if (!auth.ok) return auth.response;

  let payload: { name?: unknown; slug?: unknown; timezone?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: { name?: string; slug?: string; timezone?: string } = {};

  if (payload.name !== undefined) {
    if (typeof payload.name !== "string" || !payload.name.trim()) {
      return NextResponse.json(
        { error: "name must be a non-empty string." },
        { status: 400 },
      );
    }
    patch.name = payload.name.trim().slice(0, 120);
  }

  if (payload.slug !== undefined) {
    if (typeof payload.slug !== "string" || !SLUG_REGEX.test(payload.slug)) {
      return NextResponse.json(
        {
          error:
            "slug must use lowercase letters, digits and hyphens (no leading/trailing hyphen).",
        },
        { status: 400 },
      );
    }
    patch.slug = payload.slug.slice(0, 64);
  }

  if (payload.timezone !== undefined) {
    if (typeof payload.timezone !== "string" || !payload.timezone.trim()) {
      return NextResponse.json(
        { error: "timezone must be a non-empty IANA name." },
        { status: 400 },
      );
    }
    patch.timezone = payload.timezone.trim();
  }

  try {
    const company = await updateCompany(auth.company.id, patch);
    return NextResponse.json({ company });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "This slug is already taken." },
        { status: 409 },
      );
    }
    throw error;
  }
}
