-- ============================================================
-- Bresca — Soporte de perfiles familiares
-- Extiende profiles para admitir miembros de familia sin cuenta propia.
-- Perfil primario:  user_id = auth.uid(),  owner_user_id = NULL
-- Perfil familiar:  user_id = NULL,        owner_user_id = auth.uid()
-- ============================================================

-- user_id pasa a ser nullable (familiares no tienen cuenta de auth)
ALTER TABLE profiles ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE profiles
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN relationship  text;

-- Todo perfil debe tener al menos un owner
ALTER TABLE profiles ADD CONSTRAINT profiles_has_owner
  CHECK (user_id IS NOT NULL OR owner_user_id IS NOT NULL);

-- ── RLS: todos los perfiles accesibles por el usuario ────────

DROP POLICY "profiles_owner" ON profiles;
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL
  USING      (auth.uid() = user_id OR auth.uid() = owner_user_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = owner_user_id);

-- ── RLS downstream: reemplazar subquery en todas las tablas ──

DROP POLICY "studies_owner" ON studies;
CREATE POLICY "studies_owner" ON studies
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

DROP POLICY "drafts_owner_select" ON study_drafts;
CREATE POLICY "drafts_owner" ON study_drafts
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

DROP POLICY "qr_owner" ON qr_tokens;
CREATE POLICY "qr_owner" ON qr_tokens
  FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

DROP POLICY "consent_owner_insert" ON consent_audit;
CREATE POLICY "consent_owner_insert" ON consent_audit
  FOR INSERT WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

DROP POLICY "consent_owner_select" ON consent_audit;
CREATE POLICY "consent_owner_select" ON consent_audit
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() OR owner_user_id = auth.uid()
    )
  );

-- Índice para búsquedas por owner_user_id
CREATE INDEX idx_profiles_owner_user_id
  ON profiles(owner_user_id)
  WHERE owner_user_id IS NOT NULL;
