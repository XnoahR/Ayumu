-- ═══════════════════════════════════════════════════════════════
-- AYUMU MIGRATION: User System + Gamification + Discord
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- 1. USERS TABLE (Independent ID, optional auth links)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,
  discord_id text UNIQUE,
  email text UNIQUE,
  username text,
  display_name text,
  avatar_url text,
  is_anonymous boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_users_discord ON public.users(discord_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON public.users(auth_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. SYSTEM USER (For existing data backfill)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.users (id, username, display_name, is_anonymous)
VALUES ('00000000-0000-0000-0000-000000000000', 'system', 'System User', false)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. LINK user_quiz_packages TO users
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_quiz_packages' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_quiz_packages ADD COLUMN user_id uuid REFERENCES public.users(id);
  END IF;
END $$;

-- Backfill existing packages to system user
UPDATE public.user_quiz_packages
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id IS NULL;

-- Make user_id NOT NULL after backfill
ALTER TABLE public.user_quiz_packages
ALTER COLUMN user_id SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 4. USER SESSIONS (Exam progress tracking)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_code text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  package_id uuid REFERENCES public.user_quiz_packages(id),
  level text NOT NULL CHECK (level = ANY (ARRAY['N1'::text, 'N2'::text, 'N3'::text, 'N4'::text, 'N5'::text])),
  question_ids uuid[] NOT NULL,
  option_orders jsonb NOT NULL DEFAULT '[]'::jsonb,
  user_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text, 'abandoned'::text])),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + '24 hours'::interval),
  score integer,
  time_spent_seconds integer,
  metadata jsonb,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_code ON public.user_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON public.user_sessions(expires_at) WHERE status = 'active';

-- ═══════════════════════════════════════════════════════════════
-- 5. USER RESULTS (Permanent history)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  session_id uuid REFERENCES public.user_sessions(id),
  package_id uuid REFERENCES public.user_quiz_packages(id),
  level text NOT NULL CHECK (level = ANY (ARRAY['N1'::text, 'N2'::text, 'N3'::text, 'N4'::text, 'N5'::text])),
  score integer NOT NULL,
  total_questions integer NOT NULL,
  percentage numeric NOT NULL,
  section_breakdown jsonb,
  time_spent_seconds integer,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_results_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_results_user ON public.user_results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_level ON public.user_results(level, score);

-- ═══════════════════════════════════════════════════════════════
-- 6. ACHIEVEMENTS (Badge definitions)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon_url text,
  category text CHECK (category = ANY (ARRAY['streak'::text, 'milestone'::text, 'mastery'::text, 'special'::text])),
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  requirement_level text,
  points integer NOT NULL DEFAULT 0,
  is_secret boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);

-- ═══════════════════════════════════════════════════════════════
-- 7. USER ACHIEVEMENTS (Unlocked badges)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  achievement_id uuid NOT NULL REFERENCES public.achievements(id),
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  session_id uuid REFERENCES public.user_sessions(id),
  is_new boolean NOT NULL DEFAULT true,
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_achievement UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.user_achievements(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. USER STATS (Aggregated - updated after each exam)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id uuid NOT NULL REFERENCES public.users(id),
  total_exams integer NOT NULL DEFAULT 0,
  total_questions_answered integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_time_spent_seconds integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_exam_date date,
  avg_score numeric NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  best_level text,
  total_xp integer NOT NULL DEFAULT 0,
  current_rank text NOT NULL DEFAULT 'Beginner'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_stats_pkey PRIMARY KEY (user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 9. USER STREAKS (Daily calendar)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  date date NOT NULL,
  exam_count integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  is_perfect boolean NOT NULL DEFAULT false,
  CONSTRAINT user_streaks_pkey PRIMARY KEY (id),
  CONSTRAINT user_streaks_user_date UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON public.user_streaks(user_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. SEED ACHIEVEMENTS
-- ═══════════════════════════════════════════════════════════════
INSERT INTO public.achievements (code, name, description, category, requirement_type, requirement_value, points) VALUES
('FIRST_EXAM', 'First Steps', 'Complete your first exam', 'milestone', 'count', 1, 50),
('EXAM_10', 'Dedicated', 'Complete 10 exams', 'milestone', 'count', 10, 100),
('EXAM_50', 'Veteran', 'Complete 50 exams', 'milestone', 'count', 50, 300),
('EXAM_100', 'Legend', 'Complete 100 exams', 'milestone', 'count', 100, 500),
('PERFECT_N5', 'N5 Perfection', 'Score 100% on N5', 'mastery', 'perfect_score', 1, 200),
('PERFECT_N4', 'N4 Perfection', 'Score 100% on N4', 'mastery', 'perfect_score', 1, 250),
('STREAK_7', 'Week Warrior', '7-day streak', 'streak', 'streak', 7, 150),
('STREAK_30', 'Monthly Master', '30-day streak', 'streak', 'streak', 30, 500),
('SPEED_DEMON', 'Fast Finisher', 'Complete N5 in under 30 minutes', 'special', 'time', 1800, 100),
('MOJIGOI_MASTER', 'Kanji King', '90%+ on mojigoi section', 'mastery', 'section_accuracy', 90, 100),
('DOKKAI_MASTER', 'Reading Pro', '90%+ on dokkai section', 'mastery', 'section_accuracy', 90, 100),
('NIGHT_OWL', 'Night Owl', 'Exam completed between 00:00-05:00', 'special', 'time_of_day', 0, 50),
('EARLY_BIRD', 'Early Bird', 'Exam completed between 05:00-08:00', 'special', 'time_of_day', 0, 50),
('COMEBACK', 'The Return', 'Return after 7 days inactive', 'special', 'comeback', 7, 75)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 11. ENABLE ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users: can read own, can't read others
CREATE POLICY users_own ON public.users
  FOR ALL USING (auth.uid() = auth_id OR auth.role() = 'service_role');

-- Sessions: can read own
CREATE POLICY sessions_own ON public.user_sessions
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- Results: can read own
CREATE POLICY results_own ON public.user_results
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- Stats: can read own
CREATE POLICY stats_own ON public.user_stats
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- Streaks: can read own
CREATE POLICY streaks_own ON public.user_streaks
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- Achievements: can read own
CREATE POLICY achievements_own ON public.user_achievements
  FOR ALL USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR auth.role() = 'service_role'
  );

-- ═══════════════════════════════════════════════════════════════
-- 12. FUNCTION: Auto-update user_stats after result insert
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user_stats
  INSERT INTO public.user_stats (
    user_id, total_exams, total_questions_answered, total_correct,
    last_exam_date, best_score, best_level, updated_at
  )
  SELECT
    NEW.user_id,
    COUNT(*),
    SUM(ur.total_questions),
    SUM(ur.score),
    MAX(ur.completed_at::date),
    MAX(ur.score),
    (SELECT level FROM public.user_results WHERE user_id = NEW.user_id ORDER BY score DESC LIMIT 1),
    NOW()
  FROM public.user_results ur
  WHERE ur.user_id = NEW.user_id
  ON CONFLICT (user_id) DO UPDATE SET
    total_exams = EXCLUDED.total_exams,
    total_questions_answered = EXCLUDED.total_questions_answered,
    total_correct = EXCLUDED.total_correct,
    last_exam_date = EXCLUDED.last_exam_date,
    best_score = EXCLUDED.best_score,
    best_level = EXCLUDED.best_level,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: update stats after each result
DROP TRIGGER IF EXISTS on_result_inserted ON public.user_results;
CREATE TRIGGER on_result_inserted
  AFTER INSERT ON public.user_results
  FOR EACH ROW EXECUTE FUNCTION public.update_user_stats();

-- ═══════════════════════════════════════════════════════════════
-- 13. FUNCTION: Sync auth.users to public.users (Supabase Auth)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, auth_id, username, display_name, avatar_url, is_anonymous)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_id = EXCLUDED.auth_id,
    username = COALESCE(EXCLUDED.username, public.users.username),
    display_name = COALESCE(EXCLUDED.display_name, public.users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    is_anonymous = FALSE,
    last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: sync on auth user created/updated
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- 14. CLEANUP OLD user_key COLUMN (Optional - run manually when ready)
-- ═══════════════════════════════════════════════════════════════
-- ALTER TABLE public.user_quiz_packages DROP COLUMN IF EXISTS user_key;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════
