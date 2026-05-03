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
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Nom de l&apos;entreprise
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Identifiant public (slug)
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            required
            maxLength={64}
            pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Utilisé dans les URL publiques :{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">
            /c/{slug || "..."}/api/schedule
          </code>
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Fuseau horaire (IANA)
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            required
            placeholder="Europe/Paris"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-4">
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
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
