-- Notificaciones in-app + Sistema de referidos (3 slots por usuario)

-- ── Extender enum feedback_context ───────────────────────────────
ALTER TYPE feedback_context ADD VALUE IF NOT EXISTS 'general_feedback';

-- ── 1. notifications ─────────────────────────────────────────────
CREATE TABLE public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('study_processed','ocr_low_quality','invitation_accepted','system')),
  title       TEXT NOT NULL,
  body        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (
    profile_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Edge Functions (service role) pueden insertar — service role bypasses RLS por defecto.
-- Índice para polling/realtime eficiente
CREATE INDEX idx_notifications_profile_unread
  ON public.notifications(profile_id, read, created_at DESC)
  WHERE read = false;

-- Habilitar realtime en la tabla
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ── 2. referral_invitations ───────────────────────────────────────
CREATE TABLE public.referral_invitations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email       TEXT,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','registered')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_own" ON public.referral_invitations
  FOR SELECT USING (
    inviter_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- INSERT solo permitido si el usuario tiene < 3 invitaciones ya creadas
CREATE POLICY "referrals_insert_own" ON public.referral_invitations
  FOR INSERT WITH CHECK (
    inviter_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      SELECT COUNT(*) FROM public.referral_invitations
      WHERE inviter_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    ) < 3
  );

-- RPC: marcar invitación como registrada (llamado desde welcome page con el token)
CREATE OR REPLACE FUNCTION public.register_referral(p_token TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_inv referral_invitations%ROWTYPE;
  v_inviter_profile_id UUID;
BEGIN
  SELECT * INTO v_inv FROM referral_invitations WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;
  IF v_inv.status = 'registered' THEN RETURN; END IF;

  UPDATE referral_invitations SET status = 'registered' WHERE id = v_inv.id;

  -- Crear notificación para el invitante
  INSERT INTO notifications (profile_id, type, title, body, metadata)
  VALUES (
    v_inv.inviter_id,
    'invitation_accepted',
    'Tu invitado se unió a Bresca',
    CASE WHEN v_inv.email IS NOT NULL
         THEN v_inv.email || ' ya tiene su vault activo.'
         ELSE 'Alguien que invitaste ya tiene su vault activo.'
    END,
    jsonb_build_object('invitation_id', v_inv.id)
  );
END;
$$;
