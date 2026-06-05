
-- 1. Restrict user_roles INSERT/DELETE/UPDATE to admins only
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Storage DELETE policy on verification bucket
CREATE POLICY "Admins delete verification files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'verification' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own verification files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Lock down SECURITY DEFINER functions: revoke public exec
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
-- has_role is needed by RLS policies for authenticated users; revoke from anon/public only
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
