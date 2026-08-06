ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key ON public.profiles (lower(username)) WHERE username IS NOT NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format_chk;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format_chk CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_.]{3,24}$');