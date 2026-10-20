-- Email notifications for new tickets and enquiries.
-- On every INSERT into public.tickets or public.enquiries, calls the
-- notify-new-request Edge Function (via pg_net, async HTTP), which sends a
-- notification email through Resend to the shared admin inbox.

-- pg_net lets Postgres make outbound HTTP calls from a trigger.
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Config table so the project URL and shared secret aren't hardcoded into
-- the trigger function body. Only service_role can read/write it.
CREATE TABLE IF NOT EXISTS public.app_notify_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
ALTER TABLE public.app_notify_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_notify_config FROM anon, authenticated;
GRANT ALL ON public.app_notify_config TO service_role;

-- REPLACE THE TWO VALUES BELOW BEFORE RUNNING:
INSERT INTO public.app_notify_config (key, value) VALUES
  ('edge_function_url', 'https://ytqpjqkqxoghuzcjsxde.supabase.co/functions/v1/notify-new-request'),
  ('notify_webhook_secret', 'REPLACE_WITH_YOUR_GENERATED_SECRET')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fn_url TEXT;
  webhook_secret TEXT;
BEGIN
  SELECT value INTO fn_url FROM public.app_notify_config WHERE key = 'edge_function_url';
  SELECT value INTO webhook_secret FROM public.app_notify_config WHERE key = 'notify_webhook_secret';

  IF fn_url IS NULL OR fn_url = '' OR webhook_secret IS NULL OR webhook_secret = '' THEN
    -- Not configured yet — skip silently rather than failing the insert.
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', webhook_secret
    ),
    body := jsonb_build_object(
      'source', TG_TABLE_NAME,
      'record', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_tickets_notify ON public.tickets;
CREATE TRIGGER trg_tickets_notify
AFTER INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_new_request();

DROP TRIGGER IF EXISTS trg_enquiries_notify ON public.enquiries;
CREATE TRIGGER trg_enquiries_notify
AFTER INSERT ON public.enquiries
FOR EACH ROW EXECUTE FUNCTION public.notify_new_request();