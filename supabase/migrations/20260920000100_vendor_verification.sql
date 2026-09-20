BEGIN;

-- ============================================================
-- SHEHARA
-- Vendor verification
-- ============================================================

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS vendors_is_verified_idx
  ON public.vendors (is_verified)
  WHERE is_verified = true;

-- التاجر لا يستطيع منح نفسه التوثيق أو إزالته.
CREATE OR REPLACE FUNCTION public.protect_vendor_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.current_user_has_role('admin')
  THEN
    NEW.is_verified := OLD.is_verified;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_vendor_verification
ON public.vendors;

CREATE TRIGGER protect_vendor_verification
BEFORE UPDATE OF is_verified
ON public.vendors
FOR EACH ROW
EXECUTE FUNCTION public.protect_vendor_verification();

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
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'غير مصرح';
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
