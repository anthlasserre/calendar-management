-- Horaires d'ouverture réguliers : un enregistrement par jour de la semaine.
-- day_of_week : 0 = dimanche, 1 = lundi, ..., 6 = samedi (compatible avec Date.getDay()).
-- frequency_weeks : 1 = toutes les semaines, 2 = une semaine sur 2, etc.
-- week_offset : numéro de la semaine d'ouverture dans le cycle (0..frequency_weeks-1),
--               calculé par rapport au lundi 2000-01-03 comme époque de référence.
CREATE TABLE IF NOT EXISTS regular_hours (
  day_of_week SMALLINT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  open_time TIME,
  close_time TIME,
  frequency_weeks SMALLINT NOT NULL DEFAULT 1
    CHECK (frequency_weeks BETWEEN 1 AND 4),
  week_offset SMALLINT NOT NULL DEFAULT 0
    CHECK (week_offset >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT regular_hours_consistent CHECK (
    (is_open = FALSE)
    OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
  ),
  CONSTRAINT regular_hours_offset_in_cycle CHECK (week_offset < frequency_weeks)
);

-- Périodes de fermeture exceptionnelles (vacances, jours fériés, etc.).
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT holidays_dates_valid CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS holidays_dates_idx ON holidays (start_date, end_date);

-- Initialisation : créer les 7 jours par défaut (fermés) si la table est vide.
INSERT INTO regular_hours (day_of_week, is_open, open_time, close_time)
SELECT g, FALSE, NULL, NULL
FROM generate_series(0, 6) AS g
ON CONFLICT (day_of_week) DO NOTHING;

-- Migrations idempotentes pour les bases déjà initialisées.
ALTER TABLE regular_hours
  ADD COLUMN IF NOT EXISTS frequency_weeks SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE regular_hours
  ADD COLUMN IF NOT EXISTS week_offset SMALLINT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'regular_hours_frequency_range'
  ) THEN
    ALTER TABLE regular_hours
      ADD CONSTRAINT regular_hours_frequency_range
      CHECK (frequency_weeks BETWEEN 1 AND 4);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'regular_hours_offset_non_negative'
  ) THEN
    ALTER TABLE regular_hours
      ADD CONSTRAINT regular_hours_offset_non_negative
      CHECK (week_offset >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'regular_hours_offset_in_cycle'
  ) THEN
    ALTER TABLE regular_hours
      ADD CONSTRAINT regular_hours_offset_in_cycle
      CHECK (week_offset < frequency_weeks);
  END IF;
END $$;
