-- Ayumu migration: Anki web review preferences

CREATE TABLE IF NOT EXISTS public.user_anki_preferences (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  active_theme text NOT NULL DEFAULT 'kiku_like',
  enabled_plugins jsonb NOT NULL DEFAULT '["kiku_like_cards","review_meta_footer"]'::jsonb,
  model_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_anki_preferences_pkey PRIMARY KEY (user_id)
);

CREATE OR REPLACE FUNCTION public.touch_user_anki_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_anki_preferences_updated ON public.user_anki_preferences;
CREATE TRIGGER on_user_anki_preferences_updated
  BEFORE UPDATE ON public.user_anki_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_anki_preferences_updated_at();

ALTER TABLE public.user_anki_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_anki_preferences_own ON public.user_anki_preferences;
CREATE POLICY user_anki_preferences_own ON public.user_anki_preferences
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR auth.role() = 'service_role'
  );
