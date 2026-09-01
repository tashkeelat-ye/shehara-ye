BEGIN;

-- ============================================================
-- SHEHARA
-- Courier / Vendor / Roles Alignment
-- ============================================================

-- ------------------------------------------------------------
-- 1. إضافة courier إلى enum app_role إذا لم يكن موجوداً
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t
      ON t.oid = e.enumtypid
    WHERE
      t.typname = 'app_role'
      AND e.enumlabel = 'courier'
  ) THEN
    ALTER TYPE public.app_role
    ADD VALUE 'courier';
  END IF;
END
$$;


-- ------------------------------------------------------------
-- 2. إضافة user_id إلى couriers
-- ------------------------------------------------------------

ALTER TABLE public.couriers
ADD COLUMN IF NOT EXISTS user_id uuid;


-- ------------------------------------------------------------
-- 3. ربط courier بحساب المستخدم
-- ------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE
      conname = 'couriers_user_id_fkey'
  ) THEN

    ALTER TABLE public.couriers
    ADD CONSTRAINT couriers_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

  END IF;
END
$$;


-- ------------------------------------------------------------
-- 4. منع تكرار ربط المستخدم بأكثر من مندوب
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS
couriers_user_id_unique
ON public.couriers(user_id)
WHERE user_id IS NOT NULL;


-- ------------------------------------------------------------
-- 5. تفعيل/تعطيل حساب المندوب
-- ------------------------------------------------------------

ALTER TABLE public.couriers
ADD COLUMN IF NOT EXISTS account_enabled boolean
NOT NULL
DEFAULT false;


-- ------------------------------------------------------------
-- 6. حالة الحساب
-- ------------------------------------------------------------

ALTER TABLE public.couriers
ADD COLUMN IF NOT EXISTS status text
NOT NULL
DEFAULT 'pending';


-- ------------------------------------------------------------
-- 7. فهرسة سريعة
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS
couriers_user_id_idx
ON public.couriers(user_id);

CREATE INDEX IF NOT EXISTS
couriers_account_enabled_idx
ON public.couriers(account_enabled);


-- ------------------------------------------------------------
-- 8. Vendor user_id
-- ------------------------------------------------------------

ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS user_id uuid;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE
      conname = 'vendors_user_id_fkey'
  ) THEN

    ALTER TABLE public.vendors
    ADD CONSTRAINT vendors_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

  END IF;
END
$$;


CREATE UNIQUE INDEX IF NOT EXISTS
vendors_user_id_unique
ON public.vendors(user_id)
WHERE user_id IS NOT NULL;


CREATE INDEX IF NOT EXISTS
vendors_user_id_idx
ON public.vendors(user_id);


-- ------------------------------------------------------------
-- 9. Helper: هل المستخدم Courier فعال؟
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_courier(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.couriers c
    WHERE
      c.user_id = p_user_id
      AND c.account_enabled = true
      AND COALESCE(c.status, 'pending')
          NOT IN ('suspended', 'blocked')
  );
$$;


-- ------------------------------------------------------------
-- 10. Helper: هل المستخدم Vendor؟
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_vendor_user(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendors v
    WHERE
      v.user_id = p_user_id
  );
$$;


GRANT EXECUTE
ON FUNCTION public.is_active_courier(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.is_vendor_user(uuid)
TO authenticated;


-- ------------------------------------------------------------
-- 11. السماح للمستخدم بقراءة بيانات Courier الخاصة به
-- ------------------------------------------------------------

ALTER TABLE public.couriers
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"couriers_select_own"
ON public.couriers;


CREATE POLICY
"couriers_select_own"
ON public.couriers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);


-- ------------------------------------------------------------
-- 12. السماح للتاجر بقراءة حسابه
-- ------------------------------------------------------------

ALTER TABLE public.vendors
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"vendors_select_own"
ON public.vendors;


CREATE POLICY
"vendors_select_own"
ON public.vendors
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);


COMMIT;
