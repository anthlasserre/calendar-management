"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Holiday } from "@/lib/schedule-types";
import { CalendarPlus, CalendarRange, Plus, Trash } from "@/components/icons";

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
        className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-50/50 via-white to-white p-4 sm:grid-cols-12"
      >
        <div className="sm:col-span-4">
          <label className="section-eyebrow">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Vacances de Noël"
            className="field-input mt-1"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="section-eyebrow">Début</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="field-input mt-1"
          />
        </div>
        <div className="sm:col-span-3">
          <label className="section-eyebrow">Fin</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="field-input mt-1"
          />
        </div>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary w-full"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
        {error && (
          <p className="sm:col-span-12 text-sm text-red-600">{error}</p>
        )}
      </form>

      {holidays.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <CalendarPlus size={18} />
          </span>
          <p className="text-sm font-medium text-slate-700">
            Aucune période de fermeture à venir
          </p>
          <p className="text-xs text-slate-400">
            Ajoutez une période ci-dessus pour la voir apparaître ici.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft transition hover:shadow-lift"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <CalendarRange size={16} />
                </span>
                <div>
                  <p className="font-medium text-slate-900">{h.name}</p>
                  <p className="text-sm text-slate-500">
                    {formatRange(h.start_date, h.end_date)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDelete(h.id)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash size={14} /> Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
