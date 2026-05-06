import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  getCompanyForUserId,
  listCompaniesForUser,
} from "@/lib/companies";

export const dynamic = "force-dynamic";

export default async function ManagerRoot() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const userId = Number(session.user.id);
  const current = await getCompanyForUserId(userId);
  if (current) redirect(`/${current.slug}`);

  const memberships = await listCompaniesForUser(userId);
  if (memberships.length > 0) redirect(`/${memberships[0].slug}`);

  // No memberships at all — should not happen because signup auto-creates one,
  // but as a safeguard send the user back to sign-in.
  redirect("/sign-in");
}
