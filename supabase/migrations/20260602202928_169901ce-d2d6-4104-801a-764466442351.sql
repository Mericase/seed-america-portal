
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by TEXT,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  hear_about TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Members can view/update only their own profile
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Safe public lookup: only validates referral codes (no PII exposed by SELECT on this fn)
CREATE OR REPLACE FUNCTION public.referral_code_exists(_code TEXT)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = upper(_code));
$$;

GRANT EXECUTE ON FUNCTION public.referral_code_exists(TEXT) TO anon, authenticated;

-- Random 6-char alphanumeric code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, (floor(random() * length(chars))::int) + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Auto-create profile on signup using metadata from signUp options
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_referred_by TEXT;
  v_bonus NUMERIC := 0;
  v_attempts INT := 0;
BEGIN
  -- Generate unique referral code
  LOOP
    v_code := public.generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN EXIT; END IF;
  END LOOP;

  v_referred_by := upper(coalesce(NEW.raw_user_meta_data->>'referral_code', ''));
  IF v_referred_by = '' THEN v_referred_by := NULL; END IF;

  -- Award new-user bonus only if referral code is valid
  IF v_referred_by IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referred_by) THEN
    v_bonus := 200;
  ELSE
    v_referred_by := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, address, date_of_birth, referral_code, referred_by, balance, hear_about)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    coalesce(NEW.raw_user_meta_data->>'phone', ''),
    coalesce(NEW.raw_user_meta_data->>'address', ''),
    coalesce((NEW.raw_user_meta_data->>'date_of_birth')::date, '1900-01-01'::date),
    v_code,
    v_referred_by,
    v_bonus,
    NEW.raw_user_meta_data->>'hear_about'
  );

  -- Credit the referrer
  IF v_referred_by IS NOT NULL THEN
    UPDATE public.profiles
      SET balance = balance + 300, updated_at = now()
      WHERE referral_code = v_referred_by;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
