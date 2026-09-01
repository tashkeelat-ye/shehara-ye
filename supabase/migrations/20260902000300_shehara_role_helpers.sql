BEGIN;

-- ============================================================
-- SHEHARA
-- Role Helpers
-- ============================================================


CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id uuid,
  p_role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE
      ur.user_id = p_user_id
      AND ur.role = p_role
  );
$$;


CREATE OR REPLACE FUNCTION public.current_user_has_role(
  p_role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(
    auth.uid(),
    p_role
  );
$$;


GRANT EXECUTE
ON FUNCTION public.has_role(
  uuid,
  public.app_role
)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.current_user_has_role(
  public.app_role
)
TO authenticated;


-- ============================================================
-- تأكيد وجود Role للمندوب عند الحاجة
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_courier_role(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE
      user_id = p_user_id
      AND role = 'courier'
  ) THEN

    INSERT INTO public.user_roles (
      user_id,
      role
    )
    VALUES (
      p_user_id,
      'courier'
    );

  END IF;

END;
$$;


GRANT EXECUTE
ON FUNCTION public.ensure_courier_role(uuid)
TO authenticated;


COMMIT;
