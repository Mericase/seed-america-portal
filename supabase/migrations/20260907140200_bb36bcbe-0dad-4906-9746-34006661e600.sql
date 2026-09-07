CREATE TABLE IF NOT EXISTS public.linked_emails (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  provider text NOT NULL,
  method text NOT NULL DEFAULT 'oauth',
  verified_at timestamptz,
  connection_key_ciphertext text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.linked_emails TO authenticated;
GRANT ALL ON public.linked_emails TO service_role;
ALTER TABLE public.linked_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own linked email read" ON public.linked_emails;
CREATE POLICY "own linked email read" ON public.linked_emails FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.email_link_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_link_codes_user_idx ON public.email_link_codes (user_id, created_at DESC);
GRANT ALL ON public.email_link_codes TO service_role;
ALTER TABLE public.email_link_codes ENABLE ROW LEVEL SECURITY;