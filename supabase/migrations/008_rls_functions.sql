-- Function to check if a user has a specific permission for a product
CREATE OR REPLACE FUNCTION public.has_permission(
  p_user_id uuid,
  p_org_id uuid,
  p_product_slug text,
  p_permission_code text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_perm boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM saas_access sa
    JOIN org_members om ON om.id = sa.org_member_id
    JOIN saas_products sp ON sp.id = sa.saas_product_id
    JOIN saas_role_permissions srp ON srp.role_id = sa.saas_role_id
    JOIN saas_permissions p ON p.id = srp.permission_id
    WHERE om.user_id = p_user_id
      AND om.org_id = p_org_id
      AND sp.slug = p_product_slug
      AND p.code = p_permission_code
      AND om.status = 'active'
  ) INTO has_perm;

  RETURN has_perm;
END;
$$;

-- Function to get all permissions for a user in a product
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id uuid,
  p_product_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'role_name', COALESCE(
      (SELECT sdr.name FROM saas_default_roles sdr WHERE sdr.id = sa.saas_role_id),
      (SELECT scr.name FROM saas_custom_roles scr WHERE scr.id = sa.saas_role_id)
    ),
    'permissions', COALESCE(
      (SELECT jsonb_agg(p.code)
       FROM saas_role_permissions srp
       JOIN saas_permissions p ON p.id = srp.permission_id
       WHERE srp.role_id = sa.saas_role_id),
      '[]'::jsonb
    )
  ) INTO result
  FROM saas_access sa
  JOIN org_members om ON om.id = sa.org_member_id
  JOIN saas_products sp ON sp.id = sa.saas_product_id
  WHERE om.user_id = p_user_id
    AND sp.slug = p_product_slug
    AND om.status = 'active'
  LIMIT 1;

  RETURN COALESCE(result, jsonb_build_object('role_name', null, 'permissions', '[]'::jsonb));
END;
$$;
