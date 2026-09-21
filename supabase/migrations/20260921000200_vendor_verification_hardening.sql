BEGIN;

-- SHEHARA — idempotent vendor verification hardening.
-- Ensures the database side exists even if the earlier verification
-- migration was not applied or the project was deployed from another branch.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vendors_is_verified_idx
  ON public.vendors (is_verified);

CREATE OR REPLACE FUNCTION public.admin_set_vendor_verified(
  p_vendor_id uuid,
  p_verified boolean
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.vendors;
  caller_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
  INTO caller_is_admin;

  IF auth.uid() IS NULL OR NOT caller_is_admin THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION 'معرّف التاجر مطلوب';
  END IF;

  UPDATE public.vendors
  SET is_verified = COALESCE(p_verified, false)
  WHERE id = p_vendor_id
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'التاجر غير موجود';
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL
ON FUNCTION public.admin_set_vendor_verified(uuid, boolean)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.admin_set_vendor_verified(uuid, boolean)
TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
