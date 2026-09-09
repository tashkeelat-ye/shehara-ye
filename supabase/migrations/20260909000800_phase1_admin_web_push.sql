BEGIN;

-- =========================================================
-- Phase 1 - Admin Web Push Notifications
-- =========================================================
-- الوظائف:
-- 1. تخزين اشتراكات Web Push بشكل آمن.
-- 2. ربط الاشتراك بالمستخدم والجهاز.
-- 3. إنشاء إشعار للإدارة عند إنشاء طلب جديد.
-- 4. منع التكرار لنفس الجهاز.
-- 5. السماح للمستخدم بإدارة أجهزته فقط.
-- =========================================================


-- =========================================================
-- 1. Push subscriptions
-- =========================================================

CREATE TABLE IF NOT EXISTS public.user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  subscription jsonb NOT NULL,

  endpoint text GENERATED ALWAYS AS
    (subscription ->> 'endpoint') STORED,

  user_agent text NOT NULL DEFAULT '',

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_push_subscriptions_subscription_object_check
    CHECK (jsonb_typeof(subscription) = 'object'),

  CONSTRAINT user_push_subscriptions_endpoint_check
    CHECK (
      endpoint IS NOT NULL
      AND length(endpoint) > 10
    )
);


-- =========================================================
-- 2. Unique device endpoint
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
user_push_subscriptions_endpoint_uidx
ON public.user_push_subscriptions(endpoint);


CREATE INDEX IF NOT EXISTS
user_push_subscriptions_user_active_idx
ON public.user_push_subscriptions(user_id, is_active);


-- =========================================================
-- 3. RLS
-- =========================================================

ALTER TABLE public.user_push_subscriptions
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
user_push_subscriptions_select_own
ON public.user_push_subscriptions;

CREATE POLICY
user_push_subscriptions_select_own
ON public.user_push_subscriptions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS
user_push_subscriptions_insert_own
ON public.user_push_subscriptions;

CREATE POLICY
user_push_subscriptions_insert_own
ON public.user_push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS
user_push_subscriptions_update_own
ON public.user_push_subscriptions;

CREATE POLICY
user_push_subscriptions_update_own
ON public.user_push_subscriptions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


DROP POLICY IF EXISTS
user_push_subscriptions_delete_own
ON public.user_push_subscriptions;

CREATE POLICY
user_push_subscriptions_delete_own
ON public.user_push_subscriptions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);


REVOKE ALL
ON public.user_push_subscriptions
FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.user_push_subscriptions
TO authenticated;


-- =========================================================
-- 4. Secure subscription upsert
-- =========================================================

CREATE OR REPLACE FUNCTION public.register_push_subscription(
  _subscription jsonb,
  _user_agent text DEFAULT ''
)
RETURNS public.user_push_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _endpoint text;
  _row public.user_push_subscriptions%ROWTYPE;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF _subscription IS NULL
     OR jsonb_typeof(_subscription) <> 'object'
  THEN
    RAISE EXCEPTION 'بيانات الاشتراك غير صالحة';
  END IF;

  _endpoint := NULLIF(
    TRIM(_subscription ->> 'endpoint'),
    ''
  );

  IF _endpoint IS NULL THEN
    RAISE EXCEPTION 'عنوان Web Push غير موجود';
  END IF;


  INSERT INTO public.user_push_subscriptions (
    user_id,
    subscription,
    user_agent,
    is_active,
    updated_at
  )
  VALUES (
    _user_id,
    _subscription,
    LEFT(COALESCE(_user_agent, ''), 1000),
    true,
    now()
  )
  ON CONFLICT (endpoint)
  DO UPDATE
  SET
    user_id = EXCLUDED.user_id,
    subscription = EXCLUDED.subscription,
    user_agent = EXCLUDED.user_agent,
    is_active = true,
    updated_at = now()
  RETURNING *
  INTO _row;


  RETURN _row;
END;
$$;


REVOKE ALL
ON FUNCTION public.register_push_subscription(jsonb, text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.register_push_subscription(jsonb, text)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.register_push_subscription(jsonb, text)
TO authenticated;


-- =========================================================
-- 5. Remove current browser subscription
-- =========================================================

CREATE OR REPLACE FUNCTION public.remove_push_subscription(
  _endpoint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  DELETE FROM public.user_push_subscriptions
  WHERE user_id = _user_id
    AND endpoint = TRIM(_endpoint);

  RETURN FOUND;
END;
$$;


REVOKE ALL
ON FUNCTION public.remove_push_subscription(text)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.remove_push_subscription(text)
FROM anon;

GRANT EXECUTE
ON FUNCTION public.remove_push_subscription(text)
TO authenticated;


-- =========================================================
-- 6. Automatically update updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION public.touch_push_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
user_push_subscriptions_updated_at
ON public.user_push_subscriptions;


CREATE TRIGGER
user_push_subscriptions_updated_at
BEFORE UPDATE
ON public.user_push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.touch_push_subscription();


-- =========================================================
-- 7. Create admin notification when a new order arrives
-- =========================================================

CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin RECORD;
  _customer_name text;
  _order_total text;
BEGIN

  _customer_name :=
    COALESCE(
      NULLIF(TRIM(NEW.shipping_name), ''),
      'عميل'
    );

  _order_total :=
    COALESCE(
      to_char(
        ROUND(COALESCE(NEW.total, 0), 2),
        'FM999999999990.00'
      ),
      '0.00'
    );


  FOR _admin IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
      AND ur.user_id IS NOT NULL
  LOOP

    INSERT INTO public.notifications (
      user_id,
      title,
      body,
      kind,
      link_url,
      is_read
    )
    VALUES (
      _admin.user_id,

      'طلب جديد من شهارة 🛍️',

      'وصل طلب جديد رقم '
      || COALESCE(NEW.order_number, NEW.id::text)
      || ' من '
      || _customer_name
      || ' — الإجمالي '
      || _order_total,

      'new_order',

      '/admin/orders',

      false
    );

  END LOOP;


  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
orders_notify_admin_new_order
ON public.orders;


CREATE TRIGGER
orders_notify_admin_new_order
AFTER INSERT
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_order();


-- =========================================================
-- 8. Prevent duplicate order notification
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS
notifications_admin_new_order_unique_idx
ON public.notifications(
  user_id,
  kind,
  link_url,
  created_at
);


-- =========================================================
-- 9. Realtime publication
-- =========================================================

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END;
$$;


-- =========================================================
-- 10. Comments
-- =========================================================

COMMENT ON TABLE public.user_push_subscriptions
IS 'اشتراكات Web Push للأجهزة والمتصفحات.';

COMMENT ON FUNCTION public.register_push_subscription(jsonb, text)
IS 'تسجيل أو تحديث اشتراك Web Push للمستخدم الحالي.';

COMMENT ON FUNCTION public.remove_push_subscription(text)
IS 'إلغاء اشتراك Web Push للمستخدم الحالي.';

COMMENT ON FUNCTION public.notify_admin_new_order()
IS 'إنشاء إشعار فوري لكل مدير عند إنشاء طلب جديد.';


COMMIT;
