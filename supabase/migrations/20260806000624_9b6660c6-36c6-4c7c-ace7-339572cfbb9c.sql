-- Ensure the protected admin row exists
INSERT INTO public.user_roles (user_id, role)
SELECT 'ce351161-d991-425f-8d9f-e671c9e96861'::uuid, 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = 'ce351161-d991-425f-8d9f-e671c9e96861'::uuid AND role = 'admin'
);

CREATE OR REPLACE FUNCTION public.protect_permanent_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  protected_id uuid := 'ce351161-d991-425f-8d9f-e671c9e96861';
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id = protected_id AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'This account is a permanent administrator and cannot be removed.';
    END IF;
    RETURN OLD;
  ELSE
    IF OLD.user_id = protected_id AND OLD.role = 'admin'
       AND (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.role IS DISTINCT FROM OLD.role) THEN
      RAISE EXCEPTION 'This account is a permanent administrator and cannot be modified.';
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS protect_permanent_admin_trg ON public.user_roles;
CREATE TRIGGER protect_permanent_admin_trg
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_permanent_admin();