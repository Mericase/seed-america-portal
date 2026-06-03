
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Profile status (active/terminated)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_status text NOT NULL DEFAULT 'active';

-- Admin policies on profiles
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin storage policies on verification bucket
CREATE POLICY "Admins read verification files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'verification' AND public.has_role(auth.uid(), 'admin'));

-- Grant applications
CREATE TABLE public.grant_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,

  -- Household
  marital_status text,
  dependents int,
  household_size int,
  education text,
  ethnicity text,
  housing_status text,
  veteran text,
  disability text,
  state text,
  city text,
  zip text,

  -- Financial
  employment_status text,
  employer text,
  occupation text,
  household_income numeric,
  income_frequency text,
  monthly_expenses numeric,
  received_gov_aid_before text,
  received_gov_aid_details text,
  has_public_record text,

  -- Grant request
  grant_type text,
  grant_type_other text,
  amount_requested numeric,
  urgency text,
  purpose_description text,

  -- Disbursement
  bank_name text,
  account_holder_name text,
  account_type text,
  account_number text,
  routing_number text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.grant_applications TO authenticated;
GRANT ALL ON public.grant_applications TO service_role;

ALTER TABLE public.grant_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own applications" ON public.grant_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own applications" ON public.grant_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all applications" ON public.grant_applications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update applications" ON public.grant_applications
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete applications" ON public.grant_applications
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_grant_apps_user ON public.grant_applications(user_id);
CREATE INDEX idx_grant_apps_status ON public.grant_applications(status);
