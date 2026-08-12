-- Device tokens table for Android push notifications.
-- Stores FCM registration tokens for installed app instances.
-- No user identity is linked — notifications are broadcast to all registered devices.
-- Only admins (service_role) may read or delete tokens.
-- The app itself may register/refresh its own token anonymously.

CREATE TABLE public.device_tokens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text        NOT NULL,
  platform    text        NOT NULL DEFAULT 'android' CHECK (platform IN ('android')),
  app_version text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_token_unique UNIQUE (token)
);

-- Keep updated_at current on every update.
CREATE TRIGGER device_tokens_set_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: enabled. Tokens are sensitive — no authenticated user may read the full list.
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- The APK registers/refreshes tokens anonymously (no user account required).
-- Allow INSERT for anon: token must be non-empty and platform must be 'android'.
CREATE POLICY "App can register device token"
  ON public.device_tokens
  FOR INSERT
  TO anon
  WITH CHECK (
    length(trim(token)) > 0
    AND platform = 'android'
  );

-- Allow the app to update its own token row (token refresh).
-- Uses the unique token value to identify the row — no user ID needed.
CREATE POLICY "App can refresh device token"
  ON public.device_tokens
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (
    length(trim(token)) > 0
    AND platform = 'android'
  );

-- No SELECT policy for anon or authenticated — normal users cannot enumerate tokens.
-- service_role bypasses RLS and can SELECT/DELETE for sending + housekeeping.

-- Grants: anon may only INSERT/UPDATE; service_role gets everything.
GRANT INSERT, UPDATE ON public.device_tokens TO anon;
GRANT ALL ON public.device_tokens TO service_role;
