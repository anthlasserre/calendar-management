"use server";

import { auth, signOut } from "@/auth";
import { createCompanyForUser } from "@/lib/companies";

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function createCompanyAction(name: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Vous devez être connecté.");
  }
  const company = await createCompanyForUser(Number(session.user.id), name);
  return company.slug;
}
