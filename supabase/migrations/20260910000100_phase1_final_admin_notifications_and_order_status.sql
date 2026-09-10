BEGIN;

-- ============================================================
-- SHEHARA / شهارة للتسوق
-- PHASE 1 FINAL
--
-- إصلاح نهائي:
-- 1. إشعار الطلبات لكل حسابات الإدارة فقط.
-- 2. إرسال Web Push مباشرة من PostgreSQL عبر pg_net.
-- 3. إزالة مسار Webhook القديم لمنع التكرار والفشل.
-- 4. دعم الإشعار عندما تكون لوحة التحكم مغلقة.
-- 5. إصلاح RPC تحديث حالة الطلب.
-- 6. منع مشكلة overload / enum في PostgREST.
-- ============================================================


-- ============================================================
-- 1. pg_net
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;


-- ============================================================
-- 2. إزالة مسار الإشعار القديم
-- ============================================================

DROP TRIGGER IF EXISTS
notifications_send_web_push
ON public.notifications;

DROP FUNCTION IF EXISTS
public.trigger_send_web_push();


-- ============================================================
-- 3. دالة إرسال Web Push من notifications
--
-- هذه الدالة لا ترسل لأي مستخدم عادي.
-- لا ترسل إلا إذا كان صاحب notification يحمل admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.dispatch_admin_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _secret_key text;
  _request_id bigint;
  _project_url text;
  _is_admin boolean;
BEGIN

  -- ----------------------------------------------------------
  -- الإشعارات التي لا تخص الطلبات لا تحتاج Push هنا.
  -- ----------------------------------------------------------

  IF NEW.kind <> 'new_order' THEN
    RETURN NEW;
  END IF;


  -- ----------------------------------------------------------
  -- التأكد أن صاحب الإشعار مدير فعلي.
  -- ----------------------------------------------------------

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = NEW.user_id
      AND ur.role = 'admin'
  )
  INTO _is_admin;


  IF NOT _is_admin THEN
    RETURN NEW;
  END IF;


  -- ----------------------------------------------------------
  -- رابط المشروع
  -- ----------------------------------------------------------

  _project_url :=
    'https://qaysrebdryhkiizvexmz.supabase.co';


  -- ----------------------------------------------------------
  -- قراءة المفتاح السري من Vault.
  --
  -- لا يتم تخزين المفتاح داخل SQL.
  -- ----------------------------------------------------------

  SELECT decrypted_secret
  INTO _secret_key
  FROM vault.decrypted_secrets
  WHERE name = 'shehara_push_secret'
  LIMIT 1;


  IF _secret_key IS NULL
     OR length(trim(_secret_key)) = 0
  THEN

    RAISE WARNING
      'Shehara Web Push secret is not configured.';

    RETURN NEW;

  END IF;


  -- ----------------------------------------------------------
  -- إرسال الطلب إلى Edge Function.
  --
  -- apikey هو المكان الصحيح للمفتاح السري.
  -- ----------------------------------------------------------

  SELECT net.http_post(
    url := _project_url
      || '/functions/v1/send-web-push',

    headers := jsonb_build_object(
      'Content-Type',
      'application/json',

      'apikey',
      _secret_key
    ),

    body := jsonb_build_object(
      'notification_id',
      NEW.id,

      'user_id',
      NEW.user_id,

      'title',
      NEW.title,

      'body',
      NEW.body,

      'link_url',
      COALESCE(
        NEW.link_url,
        '/admin/orders'
      ),

      'kind',
      NEW.kind
    ),

    timeout_milliseconds := 10000

  )
  INTO _request_id;


  RETURN NEW;

END;
$$;


REVOKE ALL
ON FUNCTION public.dispatch_admin_notification_push()
FROM PUBLIC;


-- ============================================================
-- 4. Trigger واحد فقط لإرسال Web Push
-- ============================================================

CREATE TRIGGER
notifications_dispatch_admin_push
AFTER INSERT
ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION
public.dispatch_admin_notification_push();


-- ============================================================
-- 5. إعادة بناء إشعار الطلب الجديد
--
-- عند إنشاء الطلب:
--
-- orders
--   ↓
-- notify_admin_new_order
--   ↓
-- notifications لكل Admin
--   ↓
-- dispatch_admin_notification_push
--   ↓
-- Edge Function
--   ↓
-- جميع أجهزة Admin
-- ============================================================

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
  _order_number text;
BEGIN

  _customer_name :=
    COALESCE(
      NULLIF(
        TRIM(NEW.shipping_name),
        ''
      ),
      'عميل'
    );


  _order_number :=
    COALESCE(
      NULLIF(
        TRIM(NEW.order_number),
        ''
      ),
      NEW.id::text
    );


  _order_total :=
    COALESCE(
      to_char(
        ROUND(
          COALESCE(
            NEW.total,
            0
          ),
          2
        ),
        'FM999999999990.00'
      ),
      '0.00'
    );


  -- ----------------------------------------------------------
  -- إنشاء إشعار لكل حساب Admin.
  -- ----------------------------------------------------------

  FOR _admin IN
    SELECT DISTINCT
      ur.user_id
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

      'طلبية جديدة من شهارة 🛍️',

      'لديك طلبية رقم '
      || _order_number
      || ' من العميل '
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


-- ============================================================
-- 6. Trigger الطلبات
-- ============================================================

DROP TRIGGER IF EXISTS
orders_notify_admin_new_order
ON public.orders;


CREATE TRIGGER
orders_notify_admin_new_order
AFTER INSERT
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION
public.notify_admin_new_order();


-- ============================================================
-- 7. إصلاح حالة الطلب
--
-- نحذف نسخة enum القديمة من RPC.
-- السبب: PostgREST حساس جدًا لتوقيعات الدوال
-- والـoverloads ذات نفس أسماء المعاملات.
-- ============================================================

DROP FUNCTION IF EXISTS
public.update_order_status_secure(
  uuid,
  public.order_status
);


-- ============================================================
-- 8. RPC جديد يستخدم TEXT
--
-- PostgREST يستقبل string مباشرة.
-- ثم نحوله داخليًا إلى order_status.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_order_status_secure(
  _order_id uuid,
  _new_status text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
  _target_status public.order_status;
BEGIN

  -- ----------------------------------------------------------
  -- تسجيل الدخول
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION
      'يجب تسجيل الدخول';
  END IF;


  -- ----------------------------------------------------------
  -- الإدارة فقط
  -- ----------------------------------------------------------

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION
      'غير مصرح لك بتغيير حالة الطلب';
  END IF;


  -- ----------------------------------------------------------
  -- تحويل النص إلى enum.
  -- ----------------------------------------------------------

  BEGIN

    _target_status :=
      _new_status::public.order_status;

  EXCEPTION
    WHEN invalid_text_representation THEN

      RAISE EXCEPTION
        'حالة الطلب غير صالحة: %',
        _new_status;

  END;


  -- ----------------------------------------------------------
  -- قفل الطلب.
  -- ----------------------------------------------------------

  SELECT *
  INTO _order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'الطلب غير موجود';
  END IF;


  -- ----------------------------------------------------------
  -- نفس الحالة:
  -- لا يوجد خطأ، فقط إعادة الطلب.
  -- ----------------------------------------------------------

  IF _order.status = _target_status THEN
    RETURN _order;
  END IF;


  -- ----------------------------------------------------------
  -- التحقق من الانتقال.
  -- ----------------------------------------------------------

  IF NOT public.can_transition_order_status(
    _order.status,
    _target_status
  )
  THEN

    RAISE EXCEPTION
      'انتقال حالة الطلب غير مسموح: % -> %',
      _order.status,
      _target_status;

  END IF;


  -- ----------------------------------------------------------
  -- تحديث الحالة.
  -- ----------------------------------------------------------

  UPDATE public.orders
  SET
    status = _target_status,
    updated_at = now()
  WHERE id = _order_id
  RETURNING *
  INTO _order;


  RETURN _order;

END;
$$;


REVOKE ALL
ON FUNCTION public.update_order_status_secure(
  uuid,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.update_order_status_secure(
  uuid,
  text
)
TO authenticated;


-- ============================================================
-- 9. فهارس الإشعارات
-- ============================================================

CREATE INDEX IF NOT EXISTS
notifications_admin_user_kind_idx
ON public.notifications(
  user_id,
  kind,
  created_at DESC
);


-- ============================================================
-- 10. Realtime
-- ============================================================

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


-- ============================================================
-- 11. تحديث Schema Cache
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
