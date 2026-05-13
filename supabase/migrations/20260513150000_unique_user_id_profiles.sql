-- ============================================================
-- Bresca — UNIQUE parcial en profiles.user_id
--
-- Previene que un mismo usuario auth tenga más de un perfil
-- activo, causa del upload loop (fdd5f574). El índice es parcial
-- (WHERE user_id IS NOT NULL) para no afectar perfiles anónimos
-- o familia sin user_id propio.
--
-- Idempotente: IF NOT EXISTS permite re-run sin error.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
  ON profiles (user_id)
  WHERE user_id IS NOT NULL;
