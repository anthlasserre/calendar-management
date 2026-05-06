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
-- users.current_company_id : entreprise active par défaut au login (dernier
-- espace consulté). Les appartenances réelles sont dans
-- user_company_memberships.
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image TEXT,
  current_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration idempotente de l'ancien nom de colonne `company_id`
-- vers `current_company_id`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'current_company_id'
  ) THEN
    ALTER TABLE users RENAME COLUMN company_id TO current_company_id;
  END IF;
END $$;

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
-- Appartenances (M:N) : un utilisateur peut faire partie de plusieurs
-- entreprises. La colonne users.current_company_id désigne l'espace actif
-- par défaut.
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_company_memberships (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);
CREATE INDEX IF NOT EXISTS user_company_memberships_company_idx
  ON user_company_memberships (company_id);

-- Backfill depuis l'ancienne relation 1:1 (idempotent).
INSERT INTO user_company_memberships (user_id, company_id)
SELECT id, current_company_id
  FROM users
 WHERE current_company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Horaires d'ouverture réguliers (par entreprise + jour de la semaine).
-- Les plages horaires sont stockées dans regular_hour_ranges (0..N par jour).
-- frequency_weeks : 1 = toutes les semaines, 2 = une semaine sur 2, etc.
-- week_offset    : index de la semaine d'ouverture dans le cycle (0..N-1),
--                  calculé par rapport au lundi 2000-01-03.
-- ============================================================================
CREATE TABLE IF NOT EXISTS regular_hours (
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  frequency_weeks SMALLINT NOT NULL DEFAULT 1
    CHECK (frequency_weeks BETWEEN 1 AND 4),
  week_offset SMALLINT NOT NULL DEFAULT 0
    CHECK (week_offset >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, day_of_week),
  CONSTRAINT regular_hours_offset_in_cycle CHECK (week_offset < frequency_weeks)
);

-- Migration idempotente : extraction des plages horaires single-range
-- depuis regular_hours.open_time/close_time vers regular_hour_ranges.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regular_hours' AND column_name = 'open_time'
  ) THEN
    -- Crée la table cible si nécessaire (sans la créer hors du DO sinon la
    -- contrainte d'unicité (company_id, day_of_week) sur regular_hours
    -- pourrait ne pas exister encore).
    CREATE TABLE IF NOT EXISTS regular_hour_ranges (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL,
      day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      open_time TIME NOT NULL,
      close_time TIME NOT NULL,
      CONSTRAINT regular_hour_ranges_order CHECK (open_time < close_time),
      FOREIGN KEY (company_id, day_of_week)
        REFERENCES regular_hours (company_id, day_of_week) ON DELETE CASCADE
    );

    INSERT INTO regular_hour_ranges (company_id, day_of_week, open_time, close_time)
    SELECT company_id, day_of_week, open_time, close_time
      FROM regular_hours
     WHERE is_open = TRUE
       AND open_time IS NOT NULL
       AND close_time IS NOT NULL;

    ALTER TABLE regular_hours DROP CONSTRAINT IF EXISTS regular_hours_consistent;
    ALTER TABLE regular_hours DROP COLUMN open_time;
    ALTER TABLE regular_hours DROP COLUMN close_time;
  END IF;
END $$;

-- Création standard pour les nouvelles installations (la migration ci-dessus
-- ne s'exécute pas dans ce cas).
CREATE TABLE IF NOT EXISTS regular_hour_ranges (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  CONSTRAINT regular_hour_ranges_order CHECK (open_time < close_time),
  FOREIGN KEY (company_id, day_of_week)
    REFERENCES regular_hours (company_id, day_of_week) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS regular_hour_ranges_day_idx
  ON regular_hour_ranges (company_id, day_of_week);

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

-- ============================================================================
-- Invitations : un membre peut inviter une nouvelle adresse e-mail à
-- rejoindre l'entreprise. Lien à usage unique, expiration à 7 jours.
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_invitations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS company_invitations_pending_unique
  ON company_invitations (company_id, lower(email))
  WHERE accepted_at IS NULL;
CREATE INDEX IF NOT EXISTS company_invitations_email_idx
  ON company_invitations (lower(email))
  WHERE accepted_at IS NULL;
