
-- Withdrawal columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_withdrawal numeric(12,2),
  ADD COLUMN IF NOT EXISTS withdrawal_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawal_status text;

-- Support messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('in','out')),
  body text NOT NULL,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own support messages"
  ON public.support_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users insert own outgoing support messages"
  ON public.support_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND direction = 'out');

CREATE INDEX IF NOT EXISTS idx_support_messages_user_created
  ON public.support_messages (user_id, created_at);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Map Telegram message IDs back to users (for reply routing)
CREATE TABLE IF NOT EXISTS public.telegram_message_map (
  telegram_message_id bigint PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.telegram_message_map TO service_role;
ALTER TABLE public.telegram_message_map ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role accesses this table.
