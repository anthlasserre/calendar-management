"use server";

import { signIn } from "@/auth";

export async function requestMagicLink(formData: FormData) {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("Adresse email invalide.");
  }
  const rawCallback = formData.get("callbackUrl");
  const callbackUrl =
    typeof rawCallback === "string" && rawCallback.startsWith("/")
      ? rawCallback
      : "/";
  await signIn("email", {
    email: email.trim().toLowerCase(),
    redirectTo: callbackUrl,
  });
}
