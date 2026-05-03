-- Horaires d'ouverture réguliers : un enregistrement par jour de la semaine.
-- day_of_week : 0 = dimanche, 1 = lundi, ..., 6 = samedi (compatible avec Date.getDay()).
CREATE TABLE IF NOT EXISTS regular_hours (
  day_of_week SMALLINT PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  open_time TIME,
  close_time TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT regular_hours_consistent CHECK (
    (is_open = FALSE)
    OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
  )
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
