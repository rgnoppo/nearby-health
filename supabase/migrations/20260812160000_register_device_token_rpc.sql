-- Secure RPC to register device tokens anonymously without granting SELECT permissions.
-- Bypasses RLS internally (SECURITY DEFINER), allowing upsert without exposing other tokens.

CREATE OR REPLACE FUNCTION public.register_device_token(fcm_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF length(trim(fcm_token)) = 0 THEN
    RAISE EXCEPTION 'Token cannot be empty';
  END IF;

  INSERT INTO public.device_tokens (token, platform)
  VALUES (fcm_token, 'android')
  ON CONFLICT (token) DO UPDATE
  SET updated_at = now();
END;
$$;

-- Allow anonymous users to call this function
GRANT EXECUTE ON FUNCTION public.register_device_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_device_token(text) TO authenticated;
