"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DAY_LABELS_FR,
  DAY_ORDER_FR,
  type RegularHour,
} from "@/lib/schedule-types";

type Props = {
  initialHours: RegularHour[];
};

type Row = {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
};

function toRow(h: RegularHour): Row {
  return {
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    open_time: h.open_time ?? "09:00",
    close_time: h.close_time ?? "18:00",
  };
}

export function RegularHoursEditor({ initialHours }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => initialHours.map(toRow));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const orderedRows = useMemo(() => {
    const byDay = new Map(rows.map((r) => [r.day_of_week, r]));
    return DAY_ORDER_FR.map((d) => byDay.get(d)!).filter(Boolean);
  }, [rows]);

  const updateRow = (day: number, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)),
    );
  };

  const onSave = () => {
    setFeedback(null);
    const invalid = rows.find(
      (r) => r.is_open && r.open_time >= r.close_time,
    );
    if (invalid) {
      setFeedback({
        type: "error",
        message: `L'heure de fermeture doit être après l'heure d'ouverture pour ${DAY_LABELS_FR[invalid.day_of_week]}.`,
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/horaires-reguliers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hours: rows.map((r) => ({
              day_of_week: r.day_of_week,
              is_open: r.is_open,
              open_time: r.is_open ? r.open_time : null,
              close_time: r.is_open ? r.close_time : null,
            })),
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Erreur lors de l'enregistrement.");
        }
        setFeedback({
          type: "success",
          message: "Horaires enregistrés avec succès.",
        });
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
    <div>
      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {orderedRows.map((row) => (
          <li
            key={row.day_of_week}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={row.is_open}
                onChange={(e) =>
                  updateRow(row.day_of_week, { is_open: e.target.checked })
                }
              />
              <span className="w-24 font-medium text-slate-800">
                {DAY_LABELS_FR[row.day_of_week]}
              </span>
            </label>

            {row.is_open ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>de</span>
                <input
                  type="time"
                  value={row.open_time}
                  onChange={(e) =>
                    updateRow(row.day_of_week, { open_time: e.target.value })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span>à</span>
                <input
                  type="time"
                  value={row.close_time}
                  onChange={(e) =>
                    updateRow(row.day_of_week, { close_time: e.target.value })
                  }
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            ) : (
              <span className="text-sm italic text-slate-400">Fermé</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-4">
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
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {pending ? "Enregistrement…" : "Enregistrer les horaires"}
        </button>
      </div>
    </div>
  );
}
