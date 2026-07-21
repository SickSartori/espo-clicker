-- =====================================================================
-- Espò Clicker — Schema Supabase (Postgres) COMPLETO e idempotente
-- =====================================================================
-- Eseguire l'INTERO file nel SQL Editor di OGNI progetto (dev e prod).
-- Un progetto Supabase = un ambiente (niente suffissi _dev/_production:
-- la separazione è a livello di progetto, non di tabella).
--
-- Include già, dall'inizio, le due cose che altrimenti rompono tutto:
--   1) FK con ON DELETE / ON UPDATE CASCADE inline (niente ALTER dopo)
--   2) GRANT a service_role + default privileges (senza, le Edge Functions
--      danno "permission denied for table" se "expose new tables" è OFF)
-- =====================================================================

-- ---------- TABELLE ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  save_data     JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboard (
  username            TEXT PRIMARY KEY
                      REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE,
  score               TEXT NOT NULL DEFAULT '0',
  prestige_level      INT  NOT NULL DEFAULT 0,
  equipped_skin       TEXT NOT NULL DEFAULT 'default',
  total_formattazioni INT  NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friends (
  id           SERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON friends (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_requester ON friends (requester_id, status);

CREATE TABLE IF NOT EXISTS fmessages (
  id         SERIAL PRIMARY KEY,
  from_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seen       BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_fmessages_conv   ON fmessages (to_id, from_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fmessages_unseen ON fmessages (to_id, seen);

CREATE TABLE IF NOT EXISTS profiles (
  user_id        UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_clicks   BIGINT NOT NULL DEFAULT 0,
  total_playtime BIGINT NOT NULL DEFAULT 0,
  longest_combo  INT    NOT NULL DEFAULT 0,
  total_golden   INT    NOT NULL DEFAULT 0,
  skins_unlocked JSONB,
  skins_count    INT    NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  ip           TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts (ip, attempted_at);

-- ---------- RLS ----------
-- RLS ON ovunque. Nessuna policy = accesso solo via service_role (Edge Functions).
-- Eccezione: leaderboard leggibile pubblicamente (se un giorno il client la query diretta).
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard    ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fmessages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leaderboard public read" ON leaderboard;
CREATE POLICY "leaderboard public read" ON leaderboard FOR SELECT USING (true);

-- ---------- GRANT a service_role (usato dalle Edge Functions) ----------
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- ---------- RPC anti-rollback (chiamata da save-progress) ----------
CREATE OR REPLACE FUNCTION save_progress(
  p_user_id UUID,
  p_score TEXT,
  p_prestige INT,
  p_formattazioni INT,
  p_skin TEXT,
  p_save_data JSONB
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cur_score TEXT;
  cur_prestige INT;
  cur_format INT;
  v_username TEXT;
BEGIN
  SELECT username INTO v_username FROM users WHERE id = p_user_id;
  IF v_username IS NULL THEN
    RETURN 'error:no_user';
  END IF;

  SELECT score, prestige_level, total_formattazioni
    INTO cur_score, cur_prestige, cur_format
    FROM leaderboard WHERE username = v_username
    FOR UPDATE;

  -- Gerarchia anti-rollback: Formattazioni > Prestige > Score
  IF cur_format IS NOT NULL THEN
    IF p_formattazioni < cur_format THEN
      RETURN 'conflict:Format';
    ELSIF p_formattazioni = cur_format AND p_prestige < cur_prestige THEN
      RETURN 'conflict:Prestige';
    ELSIF p_formattazioni = cur_format AND p_prestige = cur_prestige
      AND p_score::float8 < cur_score::float8 THEN
      RETURN 'conflict:Score';
    END IF;
  END IF;

  UPDATE users SET save_data = p_save_data WHERE id = p_user_id;

  INSERT INTO leaderboard (username, score, prestige_level, equipped_skin, total_formattazioni, updated_at)
    VALUES (v_username, p_score, p_prestige, p_skin, p_formattazioni, NOW())
  ON CONFLICT (username) DO UPDATE SET
    score = EXCLUDED.score,
    prestige_level = EXCLUDED.prestige_level,
    equipped_skin = EXCLUDED.equipped_skin,
    total_formattazioni = EXCLUDED.total_formattazioni,
    updated_at = NOW();

  RETURN 'ok';
END;
$$;

-- ---------- Hardening RPC (applicato su dev+prod 2026-07-05) ----------
-- SECURITY DEFINER + default EXECUTE a PUBLIC = chiunque con la anon key
-- (pubblica nel JS) poteva sovrascrivere il save di qualsiasi utente via
-- /rest/v1/rpc/save_progress, bypassando l'auth save_token delle EF.
-- Solo service_role (Edge Functions) deve poterla eseguire.
REVOKE EXECUTE ON FUNCTION save_progress(UUID,TEXT,INT,INT,TEXT,JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION save_progress(UUID,TEXT,INT,INT,TEXT,JSONB) TO service_role;
-- SECURITY DEFINER senza search_path fisso = rischio hijack via schema shadowing
ALTER FUNCTION save_progress(UUID,TEXT,INT,INT,TEXT,JSONB) SET search_path = public, pg_temp;
