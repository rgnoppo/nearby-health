-- bootstrapAdmin (src/lib/admin.functions.ts) previously did its "no admin
-- exists yet" check and the role insert as two separate round-trips from
-- the server function. Two bootstrap requests arriving close together could
-- both pass the count check before either had inserted a row, resulting in
-- two admin accounts instead of the intended single one.
--
-- This function makes the check-and-insert atomic: the UNIQUE(user_id, role)
-- constraint plus doing the "does an admin already exist" check and the
-- insert inside one function body (implicitly one transaction) means a
-- second concurrent call sees the first call's row and raises, instead of a
-- window where both can succeed. SECURITY DEFINER + a fixed search_path
-- (matching the existing has_role() function) keeps it safe to expose to
-- authenticated/service_role without letting callers control search_path
-- tricks.
CREATE OR REPLACE FUNCTION public.grant_first_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lock out concurrent callers for the duration of this transaction so the
  -- existence check below can't race with another call's insert.
  LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'An admin account already exists';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
END;
$$;

-- Only the server (service_role, via supabaseAdmin) calls this — it's
-- invoked right after auth.admin.createUser() from a TanStack Start server
-- function, never directly from the browser.
REVOKE EXECUTE ON FUNCTION public.grant_first_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_first_admin(uuid) TO service_role;
