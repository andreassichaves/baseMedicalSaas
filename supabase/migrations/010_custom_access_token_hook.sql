-- Custom Access Token Hook (Supabase Auth)
-- Injeta `org_id` e `portal_role` no JWT a partir de `org_members`, para RLS usar auth.jwt()->>'org_id'.
-- Documentacao: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
-- Local: habilitar em supabase/config.toml em [auth.hook.custom_access_token].
-- Hosted: aplicar migration no projeto remoto; depois ativar o hook no Dashboard.
-- Passo a passo (URL direta, SQL Editor, validacao): ARCHITECTURE.md secao 5.1 "Como executar".

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  v_org_id uuid;
  v_portal_role text;
BEGIN
  claims := COALESCE(event->'claims', '{}'::jsonb);

  SELECT om.org_id, om.portal_role
  INTO v_org_id, v_portal_role
  FROM public.org_members om
  WHERE om.user_id = (event->>'user_id')::uuid
    AND om.status = 'active'
  ORDER BY om.joined_at ASC
  LIMIT 1;

  IF v_org_id IS NOT NULL AND v_portal_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}', to_jsonb(v_org_id::text));
    claims := jsonb_set(claims, '{portal_role}', to_jsonb(v_portal_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

COMMENT ON FUNCTION public.custom_access_token_hook(jsonb) IS
  'Supabase Auth hook: adiciona org_id e portal_role ao JWT (org_members ativo).';

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) FROM authenticated, anon, public;
