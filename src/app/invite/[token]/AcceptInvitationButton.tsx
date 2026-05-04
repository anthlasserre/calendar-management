"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@/components/icons";

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onAccept = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Échec de l'acceptation.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAccept}
        disabled={pending}
        className="btn-primary w-full"
      >
        <Check size={14} />
        {pending ? "Acceptation…" : "Accepter l'invitation"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
