-- ============================================================================
-- Multi-tenant : chaque enregistrement appartient à une entreprise (companies).
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Tables Auth.js (PostgresAdapter) :
--   users, accounts, sessions, verification_token
-- On utilise les noms de colonnes attendus par @auth/pg-adapter (camelCase).
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ============================================================================
-- Horaires d'ouverture réguliers (par entreprise + jour de la semaine).
-- frequency_weeks : 1 = toutes les semaines, 2 = une semaine sur 2, etc.
-- week_offset    : index de la semaine d'ouverture dans le cycle (0..N-1),
--                  calculé par rapport au lundi 2000-01-03.
-- ============================================================================
CREATE TABLE IF NOT EXISTS regular_hours (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  open_time TIME,
  close_time TIME,
  frequency_weeks SMALLINT NOT NULL DEFAULT 1
    CHECK (frequency_weeks BETWEEN 1 AND 4),
  week_offset SMALLINT NOT NULL DEFAULT 0
    CHECK (week_offset >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, day_of_week),
  CONSTRAINT regular_hours_consistent CHECK (
    (is_open = FALSE)
    OR (open_time IS NOT NULL AND close_time IS NOT NULL AND open_time < close_time)
  ),
  CONSTRAINT regular_hours_offset_in_cycle CHECK (week_offset < frequency_weeks)
);

-- ============================================================================
-- Périodes de fermeture exceptionnelles (par entreprise).
-- ============================================================================
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT holidays_dates_valid CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS holidays_dates_idx ON holidays (company_id, start_date, end_date);
