"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DAY_LABELS_FR,
  DAY_ORDER_FR,
  FREQUENCY_LABELS_FR,
  computeWeekOffsetForDate,
  formatYmd,
  nextOccurrencesOfWeekday,
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
  frequency_weeks: number;
  week_offset: number;
};

const FREQUENCY_OPTIONS = [1, 2, 3, 4];

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

function toRow(h: RegularHour): Row {
  return {
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    open_time: h.open_time ?? "09:00",
    close_time: h.close_time ?? "18:00",
    frequency_weeks: h.frequency_weeks,
    week_offset: h.week_offset,
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

  const onFrequencyChange = (day: number, frequency: number) => {
    if (frequency === 1) {
      updateRow(day, { frequency_weeks: 1, week_offset: 0 });
      return;
    }
    const upcoming = nextOccurrencesOfWeekday(day, 1);
    const offset = upcoming[0]
      ? computeWeekOffsetForDate(upcoming[0], frequency)
      : 0;
    updateRow(day, { frequency_weeks: frequency, week_offset: offset });
  };

  const onNextOccurrenceChange = (day: number, ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const row = rows.find((r) => r.day_of_week === day);
    if (!row) return;
    updateRow(day, {
      week_offset: computeWeekOffsetForDate(date, row.frequency_weeks),
    });
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
        const res = await fetch("/api/admin/regular-hours", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hours: rows.map((r) => ({
              day_of_week: r.day_of_week,
              is_open: r.is_open,
              open_time: r.is_open ? r.open_time : null,
              close_time: r.is_open ? r.close_time : null,
              frequency_weeks: r.is_open ? r.frequency_weeks : 1,
              week_offset: r.is_open ? r.week_offset : 0,
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
        {orderedRows.map((row) => {
          const upcoming = row.is_open
            ? nextOccurrencesOfWeekday(row.day_of_week, row.frequency_weeks)
            : [];
          const selectedNext = upcoming.find(
            (d) =>
              computeWeekOffsetForDate(d, row.frequency_weeks) ===
              row.week_offset,
          );

          return (
            <li
              key={row.day_of_week}
              className="space-y-3 px-4 py-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        updateRow(row.day_of_week, {
                          open_time: e.target.value,
                        })
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <span>à</span>
                    <input
                      type="time"
                      value={row.close_time}
                      onChange={(e) =>
                        updateRow(row.day_of_week, {
                          close_time: e.target.value,
                        })
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ) : (
                  <span className="text-sm italic text-slate-400">Fermé</span>
                )}
              </div>

              {row.is_open && (
                <div className="flex flex-wrap items-center gap-2 pl-7 text-xs text-slate-500">
                  <label className="flex items-center gap-2">
                    <span className="uppercase tracking-wide">Récurrence</span>
                    <select
                      value={row.frequency_weeks}
                      onChange={(e) =>
                        onFrequencyChange(row.day_of_week, Number(e.target.value))
                      }
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {FREQUENCY_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {FREQUENCY_LABELS_FR[f]}
                        </option>
                      ))}
                    </select>
                  </label>

                  {row.frequency_weeks > 1 && (
                    <label className="flex items-center gap-2">
                      <span className="uppercase tracking-wide">
                        Prochaine ouverture
                      </span>
                      <select
                        value={
                          selectedNext ? formatYmd(selectedNext) : ""
                        }
                        onChange={(e) =>
                          onNextOccurrenceChange(
                            row.day_of_week,
                            e.target.value,
                          )
                        }
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        {upcoming.map((d) => (
                          <option key={formatYmd(d)} value={formatYmd(d)}>
                            {DATE_FORMATTER.format(d)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
            </li>
          );
        })}
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
