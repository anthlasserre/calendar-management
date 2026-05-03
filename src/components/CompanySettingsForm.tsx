"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Company } from "@/lib/companies";

type Props = {
  initialCompany: Company;
};

export function CompanySettingsForm({ initialCompany }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialCompany.name);
  const [slug, setSlug] = useState(initialCompany.slug);
  const [timezone, setTimezone] = useState(initialCompany.timezone);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/company", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug, timezone }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Erreur lors de l'enregistrement.");
        }
        setFeedback({ type: "success", message: "Paramètres enregistrés." });
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          message:
            error instanceof Error ? error.message : "Une erreur est survenue.",
        });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="section-eyebrow">Nom de l&apos;entreprise</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="field-input mt-1"
          />
        </div>

        <div>
          <label className="section-eyebrow">Fuseau horaire (IANA)</label>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            required
            placeholder="Europe/Paris"
            className="field-input mt-1"
          />
        </div>
      </div>

      <div>
        <label className="section-eyebrow">Identifiant public (slug)</label>
        <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
          <span className="flex items-center bg-slate-50 px-3 text-xs text-slate-500">
            /c/
          </span>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            required
            maxLength={64}
            pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
            className="w-full bg-transparent px-3 py-2 text-sm text-slate-800 outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          URL d&apos;exemple :{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
            /c/{slug || "..."}/api/schedule
          </code>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
        <p
          className={
            feedback
              ? feedback.type === "success"
                ? "text-sm text-emerald-600"
                : "text-sm text-red-600"
              : "text-xs text-slate-400"
          }
        >
          {feedback?.message ??
            "Le slug doit être unique et ne peut contenir que des lettres minuscules, des chiffres et des tirets."}
        </p>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
