
-- 1) Update handle_new_user: every new user gets $50 signup bonus; referred users still get referral bonus on top
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code TEXT;
  v_referred_by TEXT;
  v_signup_bonus NUMERIC := 50;
  v_referral_bonus NUMERIC := 0;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_code := public.generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 10 THEN EXIT; END IF;
  END LOOP;

  v_referred_by := upper(coalesce(NEW.raw_user_meta_data->>'referral_code', ''));
  IF v_referred_by = '' THEN v_referred_by := NULL; END IF;

  IF v_referred_by IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_referred_by) THEN
    v_referral_bonus := 200;
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
    v_signup_bonus + v_referral_bonus,
    NEW.raw_user_meta_data->>'hear_about'
  );

  IF v_referred_by IS NOT NULL THEN
    UPDATE public.profiles
      SET balance = balance + 300, updated_at = now()
      WHERE referral_code = v_referred_by;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Enable required extensions for cron http calls
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) Schedule the tier-2 upgrade nudge job (daily at 15:00 UTC)
--    Uses the stable preview URL; will also work on production once published.
SELECT cron.unschedule('tier2-upgrade-nudge') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tier2-upgrade-nudge');

SELECT cron.schedule(
  'tier2-upgrade-nudge',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--ccac794e-6491-491e-9e46-f2ea0d6d79f3.lovable.app/api/public/hooks/tier2-nudge',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_g3QsYAAcd97X4g3VKx43ow_U806nBzx"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
