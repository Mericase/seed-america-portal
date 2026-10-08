
-- Admin tagging and member assignment
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid NULL
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_assigned_admin_id_idx
  ON public.profiles(assigned_admin_id);

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS tag text NULL;

-- Only admin rows get a unique tag; non-admin rows may remain null.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_admin_tag_unique
  ON public.user_roles(tag)
  WHERE role = 'admin' AND tag IS NOT NULL;
