-- Synthetic sandbox use only. Keep these tables off the client Data API.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ez_epic_attempts (
                                                       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_hash text NOT NULL UNIQUE,
    verifier_encrypted text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','exchanging','complete','failed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes'
    );
CREATE TABLE IF NOT EXISTS public.ez_epic_connections (
                                                          user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id text NOT NULL,
    access_encrypted text NOT NULL,
    scopes text NOT NULL,
    expires_at timestamptz NOT NULL,
    connected_at timestamptz NOT NULL DEFAULT now()
    );
CREATE TABLE IF NOT EXISTS public.ez_epic_rate_limits (
                                                          user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    window_start timestamptz NOT NULL DEFAULT now(), hits integer NOT NULL DEFAULT 0
    );
ALTER TABLE public.ez_epic_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ez_epic_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ez_epic_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ez_epic_attempts, public.ez_epic_connections, public.ez_epic_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ez_epic_attempts, public.ez_epic_connections, public.ez_epic_rate_limits TO service_role;
CREATE INDEX IF NOT EXISTS ez_epic_attempt_user_idx ON public.ez_epic_attempts(user_id, created_at);
-- One-time callback consumption works across independent workers.
CREATE OR REPLACE FUNCTION public.ez_consume_epic_attempt(p_hash text)
RETURNS SETOF public.ez_epic_attempts LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
UPDATE public.ez_epic_attempts SET status = 'exchanging'
WHERE state_hash = p_hash AND status = 'pending' AND expires_at > now() RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.ez_consume_epic_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ez_consume_epic_attempt(text) TO service_role;
-- Commit the connection and mark the attempt complete in one transaction.
-- A concurrent disconnect deletes this row first and then the connection.
CREATE OR REPLACE FUNCTION public.ez_complete_epic_attempt(p_id uuid, p_patient text, p_access text, p_scopes text, p_expires timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a public.ez_epic_attempts;
BEGIN
SELECT * INTO a FROM public.ez_epic_attempts WHERE id = p_id AND status = 'exchanging' AND expires_at > now() FOR UPDATE;
IF NOT FOUND THEN RETURN false; END IF;
INSERT INTO public.ez_epic_connections(user_id, patient_id, access_encrypted, scopes, expires_at)
VALUES(a.user_id, p_patient, p_access, p_scopes, p_expires)
    ON CONFLICT(user_id) DO UPDATE SET patient_id = excluded.patient_id, access_encrypted = excluded.access_encrypted,
                                scopes = excluded.scopes, expires_at = excluded.expires_at, connected_at = now();
UPDATE public.ez_epic_attempts SET status = 'complete', verifier_encrypted = '' WHERE id = a.id;
RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.ez_complete_epic_attempt(uuid,text,text,text,timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ez_complete_epic_attempt(uuid,text,text,text,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.ez_epic_allow_request(p_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n integer;
BEGIN
INSERT INTO public.ez_epic_rate_limits(user_id, hits) VALUES (p_user, 1)
    ON CONFLICT (user_id) DO UPDATE SET
    hits = CASE WHEN ez_epic_rate_limits.window_start < now() - interval '1 minute' THEN 1 ELSE ez_epic_rate_limits.hits + 1 END,
                                 window_start = CASE WHEN ez_epic_rate_limits.window_start < now() - interval '1 minute' THEN now() ELSE ez_epic_rate_limits.window_start END
  RETURNING hits INTO n;
RETURN n <= 40;
END;
$$;
REVOKE ALL ON FUNCTION public.ez_epic_allow_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ez_epic_allow_request(uuid) TO service_role;
COMMIT;