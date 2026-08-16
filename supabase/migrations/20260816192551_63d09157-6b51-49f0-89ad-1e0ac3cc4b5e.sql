ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier2_live_link text,
  ADD COLUMN IF NOT EXISTS tier2_live_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS tier2_live_completed_at timestamptz;