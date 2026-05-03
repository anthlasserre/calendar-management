export type RegularHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
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

export const DAY_ORDER_FR: number[] = [1, 2, 3, 4, 5, 6, 0];
