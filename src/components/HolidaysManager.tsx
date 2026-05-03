"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Holiday } from "@/lib/schedule-types";

type Props = {
  initialHolidays: Holiday[];
};

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function formatRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (start === end) return DATE_FORMATTER.format(s);
  return `${DATE_FORMATTER.format(s)} → ${DATE_FORMATTER.format(e)}`;
}

export function HolidaysManager({ initialHolidays }: Props) {
  const router = useRouter();
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setStart("");
    setEnd("");
  };

  const onAdd = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Le nom de la période est requis.");
      return;
    }
    if (!start || !end) {
      setError("Les dates de début et de fin sont requises.");
      return;
    }
    if (start > end) {
      setError("La date de fin doit être postérieure ou égale à la date de début.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/closures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            start_date: start,
            end_date: end,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Erreur lors de l'ajout.");
        }
        const created: Holiday = await res.json();
        setHolidays((prev) =>
          [...prev, created].sort((a, b) =>
            a.start_date.localeCompare(b.start_date),
          ),
        );
        reset();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  };

  const onDelete = (id: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/closures/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          throw new Error("Suppression impossible.");
        }
        setHolidays((prev) => prev.filter((h) => h.id !== id));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={onAdd}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-12"
      >
        <div className="sm:col-span-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Nom
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Vacances de Noël"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Début
          </label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Fin
          </label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            Ajouter
          </button>
        </div>
        {error && (
          <p className="sm:col-span-12 text-sm text-red-600">{error}</p>
        )}
      </form>

      {holidays.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          Aucune période de fermeture à venir n&apos;est enregistrée.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-800">{h.name}</p>
                <p className="text-sm text-slate-500">
                  {formatRange(h.start_date, h.end_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(h.id)}
                disabled={pending}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
