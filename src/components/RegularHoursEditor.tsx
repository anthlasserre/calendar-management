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
  type TimeRange,
} from "@/lib/schedule-types";
import { Check, Plus, Repeat, Trash } from "@/components/icons";

type Props = {
  companySlug: string;
  initialHours: RegularHour[];
};

type Row = {
  day_of_week: number;
  is_open: boolean;
  ranges: TimeRange[];
  frequency_weeks: number;
  week_offset: number;
};

const FREQUENCY_OPTIONS = [1, 2, 3, 4];

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});

const DEFAULT_RANGE: TimeRange = { open_time: "09:00", close_time: "18:00" };

function toRow(h: RegularHour): Row {
  return {
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    ranges:
      h.ranges.length > 0
        ? h.ranges.map((r) => ({ ...r }))
        : [{ ...DEFAULT_RANGE }],
    frequency_weeks: h.frequency_weeks,
    week_offset: h.week_offset,
  };
}

function addMinutesToHHMM(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + minutes));
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function rangesOverlap(ranges: TimeRange[]): boolean {
  const sorted = [...ranges].sort((a, b) =>
    a.open_time.localeCompare(b.open_time),
  );
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].open_time < sorted[i - 1].close_time) return true;
  }
  return false;
}

export function RegularHoursEditor({ companySlug, initialHours }: Props) {
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

  const updateRange = (
    day: number,
    index: number,
    patch: Partial<TimeRange>,
  ) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.day_of_week !== day) return r;
        const ranges = r.ranges.map((rng, i) =>
          i === index ? { ...rng, ...patch } : rng,
        );
        return { ...r, ranges };
      }),
    );
  };

  const addRange = (day: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.day_of_week !== day) return r;
        const last = r.ranges[r.ranges.length - 1];
        const nextOpen = last ? last.close_time : "14:00";
        const nextClose = addMinutesToHHMM(nextOpen, 60);
        return {
          ...r,
          ranges: [...r.ranges, { open_time: nextOpen, close_time: nextClose }],
        };
      }),
    );
  };

  const removeRange = (day: number, index: number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.day_of_week !== day) return r;
        if (r.ranges.length <= 1) return r;
        return { ...r, ranges: r.ranges.filter((_, i) => i !== index) };
      }),
    );
  };

  const onToggleOpen = (day: number, isOpen: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.day_of_week !== day) return r;
        if (isOpen) {
          return {
            ...r,
            is_open: true,
            ranges: r.ranges.length > 0 ? r.ranges : [{ ...DEFAULT_RANGE }],
          };
        }
        return { ...r, is_open: false };
      }),
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

    for (const row of rows) {
      if (!row.is_open) continue;
      for (const r of row.ranges) {
        if (r.open_time >= r.close_time) {
          setFeedback({
            type: "error",
            message: `L'heure de fermeture doit être après l'heure d'ouverture pour ${DAY_LABELS_FR[row.day_of_week]}.`,
          });
          return;
        }
      }
      if (rangesOverlap(row.ranges)) {
        setFeedback({
          type: "error",
          message: `Les plages horaires de ${DAY_LABELS_FR[row.day_of_week]} se chevauchent.`,
        });
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/${companySlug}/regular-hours`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hours: rows.map((r) => ({
              day_of_week: r.day_of_week,
              is_open: r.is_open,
              ranges: r.is_open
                ? r.ranges.map((rng) => ({
                    open_time: rng.open_time,
                    close_time: rng.close_time,
                  }))
                : [],
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
      <ul className="space-y-2">
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
              className={
                "rounded-2xl border bg-white px-4 py-3 transition " +
                (row.is_open
                  ? "border-slate-200 shadow-soft"
                  : "border-slate-200/70 bg-slate-50/60")
              }
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <label className="flex cursor-pointer items-center gap-3 select-none pt-1.5">
                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-md border border-slate-300 bg-white shadow-sm transition checked:border-brand-500 checked:bg-gradient-to-br checked:from-brand-500 checked:to-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
                      checked={row.is_open}
                      onChange={(e) =>
                        onToggleOpen(row.day_of_week, e.target.checked)
                      }
                    />
                    <Check
                      size={12}
                      className="pointer-events-none relative text-white opacity-0 peer-checked:opacity-100"
                    />
                  </span>
                  <span
                    className={
                      "w-24 font-medium tracking-tight " +
                      (row.is_open ? "text-slate-900" : "text-slate-500")
                    }
                  >
                    {DAY_LABELS_FR[row.day_of_week]}
                  </span>
                </label>

                {row.is_open ? (
                  <div className="flex flex-1 flex-col items-stretch gap-2 sm:items-end">
                    {row.ranges.map((range, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <span className="text-slate-400">de</span>
                        <input
                          type="time"
                          value={range.open_time}
                          onChange={(e) =>
                            updateRange(row.day_of_week, idx, {
                              open_time: e.target.value,
                            })
                          }
                          className="field-time"
                        />
                        <span className="text-slate-400">à</span>
                        <input
                          type="time"
                          value={range.close_time}
                          onChange={(e) =>
                            updateRange(row.day_of_week, idx, {
                              close_time: e.target.value,
                            })
                          }
                          className="field-time"
                        />
                        <button
                          type="button"
                          onClick={() => removeRange(row.day_of_week, idx)}
                          disabled={row.ranges.length <= 1}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                          aria-label="Retirer la plage"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRange(row.day_of_week)}
                      className="inline-flex items-center gap-1.5 self-end rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-700"
                    >
                      <Plus size={12} /> Ajouter une plage
                    </button>
                  </div>
                ) : (
                  <span className="text-sm italic text-slate-400">Fermé</span>
                )}
              </div>

              {row.is_open && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 pl-8 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5 text-brand-600/80">
                    <Repeat size={12} />
                    <span className="section-eyebrow">Récurrence</span>
                  </span>
                  <select
                    value={row.frequency_weeks}
                    onChange={(e) =>
                      onFrequencyChange(row.day_of_week, Number(e.target.value))
                    }
                    className="field-select"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS_FR[f]}
                      </option>
                    ))}
                  </select>

                  {row.frequency_weeks > 1 && (
                    <>
                      <span className="section-eyebrow">
                        Prochaine ouverture
                      </span>
                      <select
                        value={selectedNext ? formatYmd(selectedNext) : ""}
                        onChange={(e) =>
                          onNextOccurrenceChange(
                            row.day_of_week,
                            e.target.value,
                          )
                        }
                        className="field-select"
                      >
                        {upcoming.map((d) => (
                          <option key={formatYmd(d)} value={formatYmd(d)}>
                            {DATE_FORMATTER.format(d)}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
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
            "Les changements ne sont enregistrés qu'au clic sur le bouton."}
        </p>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Enregistrement…" : "Enregistrer les horaires"}
        </button>
      </div>
    </div>
  );
}
