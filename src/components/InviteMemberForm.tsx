"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Plus } from "@/components/icons";

type Props = { companySlug: string };

export function InviteMemberForm({ companySlug }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const value = email.trim();
    if (!value) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/${companySlug}/invitations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Échec de l'envoi de l'invitation.");
        }
        setEmail("");
        setFeedback({
          type: "success",
          message: `Invitation envoyée à ${value}.`,
        });
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Une erreur est survenue.",
        });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="section-eyebrow">Inviter par e-mail</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Mail size={14} />
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collegue@exemple.com"
            className="field-input pl-9"
            disabled={pending}
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          <Plus size={14} />
          {pending ? "Envoi…" : "Envoyer l'invitation"}
        </button>
      </div>
      {feedback ? (
        <p
          className={
            feedback.type === "success"
              ? "text-sm text-emerald-600"
              : "text-sm text-red-600"
          }
        >
          {feedback.message}
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          L&apos;invitation est valable 7 jours et peut être révoquée à tout
          moment.
        </p>
      )}
    </form>
  );
}
