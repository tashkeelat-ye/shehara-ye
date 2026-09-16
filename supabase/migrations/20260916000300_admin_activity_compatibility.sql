BEGIN;

-- ============================================================
-- SHEHARA
-- ADMIN ACTIVITY COMPATIBILITY
-- 20260916000300
--
-- إصلاح:
-- relation "public.user_activity_profiles" does not exist
--
-- لا نحذف أو نعدل بيانات النشاط الحالية.
-- لا نلمس الطلبات أو الفواتير أو المحافظ.
-- ============================================================


-- ============================================================
-- 1. إنشاء طبقة التوافق تلقائياً
-- ============================================================

DO $activity_compat$
DECLARE
  source_table text;
  candidate text;
  candidates text[] := ARRAY[
    'user_activity',
    'user_activity_log',
    'user_activity_logs',
    'activity_logs',
    'activity_log'
  ];

  view_sql text;
BEGIN

  -- ----------------------------------------------------------
  -- إذا كان الاسم المتوقع موجوداً فلا نفعل شيئاً.
  -- ----------------------------------------------------------

  IF to_regclass('public.user_activity_profiles') IS NOT NULL THEN
    RETURN;
  END IF;


  -- ----------------------------------------------------------
  -- محاولة معرفة الجدول الذي تستخدمه record_user_activity
  -- فعلياً.
  -- ----------------------------------------------------------

  SELECT m[1]
  INTO source_table
  FROM pg_proc p
  CROSS JOIN LATERAL regexp_matches(
    pg_get_functiondef(p.oid),
    'INSERT[[:space:]]+INTO[[:space:]]+public\.([A-Za-z_][A-Za-z0-9_]*)',
    'i'
  ) AS m
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname = 'record_user_activity'
  LIMIT 1;


  -- ----------------------------------------------------------
  -- إذا لم نكتشف المصدر من الدالة، نجرب الأسماء المعروفة.
  -- ----------------------------------------------------------

  IF source_table IS NULL THEN

    FOREACH candidate IN ARRAY candidates
    LOOP

      IF to_regclass(
        format('public.%I', candidate)
      ) IS NOT NULL THEN

        source_table := candidate;
        EXIT;

      END IF;

    END LOOP;

  END IF;


  -- ----------------------------------------------------------
  -- إذا لم يوجد أي مصدر حالياً:
  -- ننشئ جدول توافق آمن ليصبح النظام قابلاً للعمل،
  -- ويمكن لـ record_user_activity استخدامه مستقبلاً.
  -- ----------------------------------------------------------

  IF source_table IS NULL THEN

    CREATE TABLE public.user_activity_profiles (

      user_id uuid PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

      first_visit_at timestamptz,
      last_active_at timestamptz,

      last_ip text,
      ip_country text,
      ip_region text,
      ip_city text,

      device_type text,
      os_name text,
      browser_name text,
      user_agent text,

      latitude double precision,
      longitude double precision,
      location_accuracy double precision,

      last_path text,

      order_location_latitude double precision,
      order_location_longitude double precision,
      order_location_at timestamptz,

      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()

    );

    RETURN;

  END IF;


  -- ----------------------------------------------------------
  -- إنشاء View توافق فوق مصدر النشاط الحقيقي.
  --
  -- نستخدم to_jsonb حتى لا نفترض أسماء الأعمدة الداخلية
  -- للجدول الحقيقي.
  -- ----------------------------------------------------------

  view_sql := format(
$view$
CREATE VIEW public.user_activity_profiles
WITH (security_barrier = true)
AS
SELECT DISTINCT ON (t.user_id)

  t.user_id,

  COALESCE(
    NULLIF(to_jsonb(t)->>'first_visit_at', ''),
    NULLIF(to_jsonb(t)->>'first_seen_at', ''),
    NULLIF(to_jsonb(t)->>'created_at', '')
  )::timestamptz
    AS first_visit_at,

  COALESCE(
    NULLIF(to_jsonb(t)->>'last_active_at', ''),
    NULLIF(to_jsonb(t)->>'last_seen_at', ''),
    NULLIF(to_jsonb(t)->>'updated_at', ''),
    NULLIF(to_jsonb(t)->>'created_at', '')
  )::timestamptz
    AS last_active_at,

  COALESCE(
    NULLIF(to_jsonb(t)->>'last_ip', ''),
    NULLIF(to_jsonb(t)->>'ip_address', ''),
    NULLIF(to_jsonb(t)->>'ip', '')
  )
    AS last_ip,

  COALESCE(
    NULLIF(to_jsonb(t)->>'ip_country', ''),
    NULLIF(to_jsonb(t)->>'country', '')
  )
    AS ip_country,

  COALESCE(
    NULLIF(to_jsonb(t)->>'ip_region', ''),
    NULLIF(to_jsonb(t)->>'region', '')
  )
    AS ip_region,

  COALESCE(
    NULLIF(to_jsonb(t)->>'ip_city', ''),
    NULLIF(to_jsonb(t)->>'city', '')
  )
    AS ip_city,

  COALESCE(
    NULLIF(to_jsonb(t)->>'device_type', ''),
    NULLIF(to_jsonb(t)->>'device', '')
  )
    AS device_type,

  COALESCE(
    NULLIF(to_jsonb(t)->>'os_name', ''),
    NULLIF(to_jsonb(t)->>'operating_system', ''),
    NULLIF(to_jsonb(t)->>'os', '')
  )
    AS os_name,

  COALESCE(
    NULLIF(to_jsonb(t)->>'browser_name', ''),
    NULLIF(to_jsonb(t)->>'browser', '')
  )
    AS browser_name,

  NULLIF(
    to_jsonb(t)->>'user_agent',
    ''
  )
    AS user_agent,

  CASE
    WHEN COALESCE(
      NULLIF(to_jsonb(t)->>'latitude', ''),
      NULLIF(to_jsonb(t)->>'lat', '')
    ) ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN
      COALESCE(
        NULLIF(to_jsonb(t)->>'latitude', ''),
        NULLIF(to_jsonb(t)->>'lat', '')
      )::double precision
    ELSE NULL
  END
    AS latitude,

  CASE
    WHEN COALESCE(
      NULLIF(to_jsonb(t)->>'longitude', ''),
      NULLIF(to_jsonb(t)->>'lng', ''),
      NULLIF(to_jsonb(t)->>'lon', '')
    ) ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN
      COALESCE(
        NULLIF(to_jsonb(t)->>'longitude', ''),
        NULLIF(to_jsonb(t)->>'lng', ''),
        NULLIF(to_jsonb(t)->>'lon', '')
      )::double precision
    ELSE NULL
  END
    AS longitude,

  CASE
    WHEN COALESCE(
      NULLIF(to_jsonb(t)->>'location_accuracy', ''),
      NULLIF(to_jsonb(t)->>'accuracy', '')
    ) ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN
      COALESCE(
        NULLIF(to_jsonb(t)->>'location_accuracy', ''),
        NULLIF(to_jsonb(t)->>'accuracy', '')
      )::double precision
    ELSE NULL
  END
    AS location_accuracy,

  COALESCE(
    NULLIF(to_jsonb(t)->>'last_path', ''),
    NULLIF(to_jsonb(t)->>'path', '')
  )
    AS last_path,

  CASE
    WHEN to_jsonb(t)->>'order_location_latitude'
      ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN
      (to_jsonb(t)->>'order_location_latitude')::double precision
    ELSE NULL
  END
    AS order_location_latitude,

  CASE
    WHEN to_jsonb(t)->>'order_location_longitude'
      ~ '^-?[0-9]+(\.[0-9]+)?$'
    THEN
      (to_jsonb(t)->>'order_location_longitude')::double precision
    ELSE NULL
  END
    AS order_location_longitude,

  CASE
    WHEN COALESCE(
      NULLIF(to_jsonb(t)->>'order_location_at', ''),
      NULL
    ) IS NOT NULL
    THEN
      (to_jsonb(t)->>'order_location_at')::timestamptz
    ELSE NULL
  END
    AS order_location_at,

  CASE
    WHEN to_jsonb(t)->>'created_at' IS NOT NULL
    THEN
      (to_jsonb(t)->>'created_at')::timestamptz
    ELSE now()
  END
    AS created_at,

  CASE
    WHEN to_jsonb(t)->>'updated_at' IS NOT NULL
    THEN
      (to_jsonb(t)->>'updated_at')::timestamptz
    ELSE now()
  END
    AS updated_at

FROM public.%I t

WHERE t.user_id IS NOT NULL

ORDER BY
  t.user_id,
  COALESCE(
    NULLIF(to_jsonb(t)->>'last_active_at', ''),
    NULLIF(to_jsonb(t)->>'last_seen_at', ''),
    NULLIF(to_jsonb(t)->>'updated_at', ''),
    NULLIF(to_jsonb(t)->>'created_at', '')
  ) DESC NULLS LAST;
$view$,
    source_table
  );


  EXECUTE view_sql;

END
$activity_compat$;


-- ============================================================
-- 2. حماية بيانات النشاط
-- ============================================================

REVOKE ALL
ON TABLE public.user_activity_profiles
FROM PUBLIC;

REVOKE ALL
ON TABLE public.user_activity_profiles
FROM anon;

REVOKE ALL
ON TABLE public.user_activity_profiles
FROM authenticated;


-- ============================================================
-- 3. إعادة تحميل PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
