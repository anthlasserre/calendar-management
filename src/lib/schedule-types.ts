export type TimeRange = {
  open_time: string;
  close_time: string;
};

export type RegularHour = {
  day_of_week: number;
  is_open: boolean;
  frequency_weeks: number;
  week_offset: number;
  ranges: TimeRange[];
};

export type Holiday = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
};

export const DAY_LABELS_FR = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export const DAY_LABELS_EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_ORDER_FR: number[] = [1, 2, 3, 4, 5, 6, 0];

export const FREQUENCY_LABELS_FR: Record<number, string> = {
  1: "Toutes les semaines",
  2: "Une semaine sur 2",
  3: "Une semaine sur 3",
  4: "Une semaine sur 4",
};

const EPOCH_MONDAY_UTC_MS = Date.UTC(2000, 0, 3);
const ONE_DAY_MS = 86_400_000;

function startOfDayLocal(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function weeksSinceEpoch(date: Date): number {
  const utcDayMs =
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
    EPOCH_MONDAY_UTC_MS;
  return Math.floor(Math.floor(utcDayMs / ONE_DAY_MS) / 7);
}

export function dateMatchesFrequency(
  date: Date,
  frequencyWeeks: number,
  weekOffset: number,
): boolean {
  if (frequencyWeeks <= 1) return true;
  const weeks = weeksSinceEpoch(date);
  const remainder = ((weeks % frequencyWeeks) + frequencyWeeks) % frequencyWeeks;
  return remainder === weekOffset;
}

export function computeWeekOffsetForDate(
  date: Date,
  frequencyWeeks: number,
): number {
  if (frequencyWeeks <= 1) return 0;
  const weeks = weeksSinceEpoch(date);
  return ((weeks % frequencyWeeks) + frequencyWeeks) % frequencyWeeks;
}

export function nextOccurrencesOfWeekday(
  dayOfWeek: number,
  count: number,
  from: Date = new Date(),
): Date[] {
  const result: Date[] = [];
  const start = startOfDayLocal(from);
  for (let i = 0; i < count * 7 + 7 && result.length < count; i++) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + i);
    if (candidate.getDay() === dayOfWeek) result.push(candidate);
  }
  return result;
}

export function nextMatchingDate(
  dayOfWeek: number,
  frequencyWeeks: number,
  weekOffset: number,
  from: Date = new Date(),
): Date | null {
  const start = startOfDayLocal(from);
  for (let i = 0; i <= frequencyWeeks * 7 + 7; i++) {
    const candidate = new Date(start);
    candidate.setDate(start.getDate() + i);
    if (candidate.getDay() !== dayOfWeek) continue;
    if (dateMatchesFrequency(candidate, frequencyWeeks, weekOffset)) {
      return candidate;
    }
  }
  return null;
}

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
