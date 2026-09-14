BEGIN;

-- ============================================================
-- SHEHARA
-- ADMIN ACCOUNT MANAGEMENT + REAL CUSTOMER CRM DATA
-- ============================================================


-- ============================================================
-- 1. بيانات النشاط التقنية الحقيقية
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_activity_profiles (
  user_id uuid
    PRIMARY KEY
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  first_visit_at timestamptz
    NOT NULL
    DEFAULT now(),

  last_active_at timestamptz
    NOT NULL
    DEFAULT now(),

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

  updated_at timestamptz
    NOT NULL
    DEFAULT now()
);


CREATE INDEX IF NOT EXISTS
user_activity_last_active_idx
ON public.user_activity_profiles(
  last_active_at DESC
);


ALTER TABLE public.user_activity_profiles
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.user_activity_profiles
FROM anon, authenticated;


GRANT ALL
ON public.user_activity_profiles
TO service_role;


-- ============================================================
-- 2. إدارة المحفظة الحقيقية
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_wallet_balance(
  p_user_id uuid,
  p_currency text,
  p_amount numeric,
  p_mode text DEFAULT 'delta',
  p_reason text DEFAULT ''
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _wallet public.wallets%ROWTYPE;

  _currency text :=
    upper(
      trim(
        coalesce(
          p_currency,
          'YER'
        )
      )
    );

  _mode text :=
    lower(
      trim(
        coalesce(
          p_mode,
          'delta'
        )
      )
    );

  _before numeric(14,2);

  _after numeric(14,2);

  _delta numeric(14,2);

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المستخدم مطلوب';
  END IF;


  IF _currency NOT IN (
    'YER',
    'SAR'
  )
  THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;


  IF p_amount IS NULL
     OR NOT isfinite(p_amount)
  THEN
    RAISE EXCEPTION
      'قيمة الرصيد غير صالحة';
  END IF;


  IF _mode NOT IN (
    'delta',
    'set'
  )
  THEN
    RAISE EXCEPTION
      'وضع تعديل الرصيد غير صالح';
  END IF;


  PERFORM public.ensure_wallet(
    p_user_id,
    _currency
  );


  SELECT *
  INTO _wallet

  FROM public.wallets

  WHERE user_id = p_user_id

    AND currency = _currency

  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'تعذر الوصول إلى المحفظة';
  END IF;


  _before :=
    round(
      coalesce(
        _wallet.balance,
        0
      ),
      2
    );


  IF _mode = 'set' THEN

    _after :=
      round(
        p_amount,
        2
      );

    _delta :=
      _after - _before;

  ELSE

    _delta :=
      round(
        p_amount,
        2
      );

    _after :=
      _before + _delta;

  END IF;


  IF _after < 0 THEN
    RAISE EXCEPTION
      'لا يمكن أن يصبح رصيد المحفظة سالباً';
  END IF;


  UPDATE public.wallets

  SET
    balance = _after,
    updated_at = now()

  WHERE id = _wallet.id

  RETURNING *
  INTO _wallet;


  IF _delta <> 0 THEN

    INSERT INTO public.wallet_transactions(
      wallet_id,
      user_id,
      currency,
      transaction_type,
      kind,
      amount,
      balance_before,
      balance_after,
      description,
      reference_type,
      reference_id,
      created_by
    )

    VALUES(
      _wallet.id,
      p_user_id,
      _currency,

      CASE
        WHEN _delta > 0
        THEN 'credit'
        ELSE 'debit'
      END,

      CASE
        WHEN _delta > 0
        THEN 'credit'
        ELSE 'debit'
      END,

      abs(_delta),

      _before,

      _after,

      left(
        coalesce(
          nullif(
            trim(p_reason),
            ''
          ),
          'تعديل رصيد من الإدارة'
        ),
        500
      ),

      'admin_adjustment',

      gen_random_uuid(),

      auth.uid()
    );

  END IF;


  RETURN _wallet;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_update_wallet_balance(
  uuid,
  text,
  numeric,
  text,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_update_wallet_balance(
  uuid,
  text,
  numeric,
  text,
  text
)
TO authenticated;


-- ============================================================
-- 3. تعطيل / تفعيل حساب المستخدم
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_user_disabled(
  p_user_id uuid,
  p_disabled boolean
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _profile public.profiles%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المستخدم مطلوب';
  END IF;


  IF p_user_id = auth.uid()
     AND coalesce(
       p_disabled,
       false
     )
  THEN
    RAISE EXCEPTION
      'لا يمكنك تعطيل حساب الإدارة الحالي';
  END IF;


  UPDATE public.profiles

  SET
    is_disabled =
      coalesce(
        p_disabled,
        false
      ),

    updated_at =
      now()

  WHERE id = p_user_id

  RETURNING *
  INTO _profile;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المستخدم غير موجود';
  END IF;


  RETURN _profile;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_user_disabled(
  uuid,
  boolean
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_set_user_disabled(
  uuid,
  boolean
)
TO authenticated;


-- ============================================================
-- 4. تفعيل / تعطيل المتجر
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_set_vendor_enabled(
  p_vendor_id uuid,
  p_enabled boolean
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _vendor public.vendors%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  UPDATE public.vendors

  SET
    is_active =
      coalesce(
        p_enabled,
        false
      ),

    account_enabled =
      coalesce(
        p_enabled,
        false
      )

  WHERE id = p_vendor_id

  RETURNING *
  INTO _vendor;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المتجر غير موجود';
  END IF;


  RETURN _vendor;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_set_vendor_enabled(
  uuid,
  boolean
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_set_vendor_enabled(
  uuid,
  boolean
)
TO authenticated;


-- ============================================================
-- 5. تعديل بيانات المستخدم بواسطة الإدارة
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id uuid,
  p_first_name text DEFAULT NULL,
  p_second_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_contact_email text DEFAULT NULL,
  p_province text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _profile public.profiles%ROWTYPE;

  _first text;

  _second text;

  _last text;

  _full_name text;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  SELECT *
  INTO _profile

  FROM public.profiles

  WHERE id = p_user_id

  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المستخدم غير موجود';
  END IF;


  _first :=
    coalesce(
      nullif(
        trim(p_first_name),
        ''
      ),
      _profile.first_name
    );


  _second :=
    coalesce(
      nullif(
        trim(p_second_name),
        ''
      ),
      _profile.second_name
    );


  _last :=
    coalesce(
      nullif(
        trim(p_last_name),
        ''
      ),
      _profile.last_name
    );


  _full_name :=
    concat_ws(
      ' ',
      nullif(
        trim(_first),
        ''
      ),
      nullif(
        trim(_second),
        ''
      ),
      nullif(
        trim(_last),
        ''
      )
    );


  UPDATE public.profiles

  SET
    first_name = _first,

    second_name = _second,

    last_name = _last,

    full_name =
      coalesce(
        nullif(
          _full_name,
          ''
        ),
        full_name
      ),

    phone =
      coalesce(
        nullif(
          trim(p_phone),
          ''
        ),
        phone
      ),

    contact_email =
      coalesce(
        nullif(
          trim(p_contact_email),
          ''
        ),
        contact_email
      ),

    province =
      coalesce(
        trim(p_province),
        province
      ),

    updated_at = now()

  WHERE id = p_user_id

  RETURNING *
  INTO _profile;


  RETURN _profile;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_update_user_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_update_user_profile(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text
)
TO authenticated;


-- ============================================================
-- 6. تسجيل النشاط الحقيقي للحساب
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_user_activity(
  p_user_id uuid,
  p_ip text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_os_name text DEFAULT NULL,
  p_browser_name text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_accuracy double precision DEFAULT NULL,
  p_path text DEFAULT NULL
)
RETURNS public.user_activity_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _activity public.user_activity_profiles%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL
     OR auth.uid() <> p_user_id
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  INSERT INTO public.user_activity_profiles(
    user_id,
    first_visit_at,
    last_active_at,
    last_ip,
    ip_country,
    ip_region,
    ip_city,
    device_type,
    os_name,
    browser_name,
    user_agent,
    latitude,
    longitude,
    location_accuracy,
    last_path,
    updated_at
  )

  VALUES(
    p_user_id,
    now(),
    now(),
    nullif(
      trim(p_ip),
      ''
    ),
    nullif(
      trim(p_country),
      ''
    ),
    nullif(
      trim(p_region),
      ''
    ),
    nullif(
      trim(p_city),
      ''
    ),
    nullif(
      trim(p_device_type),
      ''
    ),
    nullif(
      trim(p_os_name),
      ''
    ),
    nullif(
      trim(p_browser_name),
      ''
    ),
    nullif(
      trim(p_user_agent),
      ''
    ),
    p_latitude,
    p_longitude,
    p_accuracy,
    left(
      coalesce(
        p_path,
        ''
      ),
      500
    ),
    now()
  )

  ON CONFLICT(
    user_id
  )

  DO UPDATE SET

    last_active_at =
      now(),

    last_ip =
      coalesce(
        excluded.last_ip,
        public.user_activity_profiles.last_ip
      ),

    ip_country =
      coalesce(
        excluded.ip_country,
        public.user_activity_profiles.ip_country
      ),

    ip_region =
      coalesce(
        excluded.ip_region,
        public.user_activity_profiles.ip_region
      ),

    ip_city =
      coalesce(
        excluded.ip_city,
        public.user_activity_profiles.ip_city
      ),

    device_type =
      coalesce(
        excluded.device_type,
        public.user_activity_profiles.device_type
      ),

    os_name =
      coalesce(
        excluded.os_name,
        public.user_activity_profiles.os_name
      ),

    browser_name =
      coalesce(
        excluded.browser_name,
        public.user_activity_profiles.browser_name
      ),

    user_agent =
      coalesce(
        excluded.user_agent,
        public.user_activity_profiles.user_agent
      ),

    latitude =
      coalesce(
        excluded.latitude,
        public.user_activity_profiles.latitude
      ),

    longitude =
      coalesce(
        excluded.longitude,
        public.user_activity_profiles.longitude
      ),

    location_accuracy =
      coalesce(
        excluded.location_accuracy,
        public.user_activity_profiles.location_accuracy
      ),

    last_path =
      coalesce(
        excluded.last_path,
        public.user_activity_profiles.last_path
      ),

    updated_at =
      now()

  RETURNING *
  INTO _activity;


  RETURN _activity;

END;
$$;


REVOKE ALL
ON FUNCTION public.record_user_activity(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  double precision,
  text
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.record_user_activity(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  double precision,
  double precision,
  double precision,
  text
)
TO authenticated;


-- ============================================================
-- 7. تفاصيل حساب العميل بالكامل
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_user_account_details(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _profile jsonb;

  _roles jsonb;

  _vendor jsonb;

  _wallets jsonb;

  _transactions jsonb;

  _addresses jsonb;

  _activity jsonb;

  _wishlist jsonb;

  _orders jsonb;

  _metrics jsonb;

  _order_latitude double precision;

  _order_longitude double precision;

  _order_location_at timestamptz;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  SELECT
    to_jsonb(p)

  INTO _profile

  FROM public.profiles p

  WHERE p.id = p_user_id;


  IF _profile IS NULL THEN
    RAISE EXCEPTION
      'المستخدم غير موجود';
  END IF;


  SELECT
    coalesce(
      jsonb_agg(
        ur.role
        ORDER BY ur.role
      ),
      '[]'::jsonb
    )

  INTO _roles

  FROM public.user_roles ur

  WHERE ur.user_id = p_user_id;


  SELECT
    coalesce(
      to_jsonb(v),
      '{}'::jsonb
    )

  INTO _vendor

  FROM public.vendors v

  WHERE v.user_id = p_user_id

  LIMIT 1;


  SELECT
    coalesce(
      jsonb_agg(
        to_jsonb(w)
        ORDER BY w.currency
      ),
      '[]'::jsonb
    )

  INTO _wallets

  FROM public.wallets w

  WHERE w.user_id = p_user_id;


  SELECT
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          wt.id,

          'amount',
          wt.amount,

          'balance_before',
          coalesce(
            wt.balance_before,
            0
          ),

          'balance_after',
          coalesce(
            wt.balance_after,
            0
          ),

          'currency',
          wt.currency,

          'transaction_type',
          coalesce(
            wt.transaction_type,
            wt.kind,
            ''
          ),

          'kind',
          wt.kind,

          'description',
          coalesce(
            wt.description,
            ''
          ),

          'reason',
          coalesce(
            wt.description,
            ''
          ),

          'created_at',
          wt.created_at,

          'created_by',
          wt.created_by,

          'order_id',
          wt.order_id,

          'reference_id',
          wt.reference_id,

          'reference_type',
          wt.reference_type
        )
        ORDER BY wt.created_at DESC
      ),
      '[]'::jsonb
    )

  INTO _transactions

  FROM public.wallet_transactions wt

  WHERE wt.user_id = p_user_id;


  SELECT
    coalesce(
      jsonb_agg(
        to_jsonb(a)
        ORDER BY
          a.is_default DESC,
          a.created_at DESC
      ),
      '[]'::jsonb
    )

  INTO _addresses

  FROM public.addresses a

  WHERE a.user_id = p_user_id;


  SELECT
    coalesce(
      to_jsonb(a),
      '{}'::jsonb
    )

  INTO _activity

  FROM public.user_activity_profiles a

  WHERE a.user_id = p_user_id;


  IF _activity IS NULL THEN

    _activity :=
      '{}'::jsonb;

  END IF;


  SELECT
    o.latitude,
    o.longitude,
    o.created_at

  INTO
    _order_latitude,
    _order_longitude,
    _order_location_at

  FROM public.orders o

  WHERE o.user_id = p_user_id

    AND o.latitude IS NOT NULL

    AND o.longitude IS NOT NULL

  ORDER BY o.created_at DESC

  LIMIT 1;


  IF _order_latitude IS NOT NULL
     AND (
       (_activity->>'latitude') IS NULL
       OR (_activity->>'longitude') IS NULL
     )
  THEN

    _activity :=
      _activity
      || jsonb_build_object(
        'order_location_latitude',
        _order_latitude,

        'order_location_longitude',
        _order_longitude,

        'order_location_at',
        _order_location_at
      );

  END IF;


  SELECT
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'id',
          w.id,

          'product_id',
          w.product_id,

          'created_at',
          w.created_at,

          'product',
          jsonb_build_object(
            'id',
            p.id,

            'name',
            p.name,

            'price',
            p.price,

            'old_price',
            p.old_price,

            'images',
            p.images,

            'is_active',
            p.is_active,

            'vendor_id',
            p.vendor_id
          )

        )
        ORDER BY w.created_at DESC
      ),
      '[]'::jsonb
    )

  INTO _wishlist

  FROM public.wishlists w

  JOIN public.products p
    ON p.id = w.product_id

  WHERE w.user_id = p_user_id;


  SELECT
    coalesce(
      jsonb_agg(

        jsonb_build_object(

          'id',
          o.id,

          'order_number',
          o.order_number,

          'invoice_number',
          o.invoice_number,

          'status',
          o.status,

          'payment_status',
          o.payment_status,

          'payment_method_code',
          o.payment_method_code,

          'subtotal',
          o.subtotal,

          'delivery_fee',
          o.delivery_fee,

          'total',
          o.total,

          'currency',
          o.currency,

          'shipping_city',
          o.shipping_city,

          'shipping_district',
          o.shipping_district,

          'shipping_details',
          o.shipping_details,

          'created_at',
          o.created_at,

          'updated_at',
          o.updated_at,

          'latitude',
          o.latitude,

          'longitude',
          o.longitude,

          'items',
          coalesce(

            (
              SELECT
                jsonb_agg(

                  jsonb_build_object(

                    'id',
                    oi.id,

                    'product_id',
                    oi.product_id,

                    'product_name',
                    oi.product_name,

                    'product_image',
                    oi.product_image,

                    'unit_price',
                    oi.unit_price,

                    'quantity',
                    oi.quantity,

                    'size',
                    oi.size,

                    'color',
                    oi.color,

                    'vendor_id',
                    oi.vendor_id,

                    'vendor_name',
                    oi.vendor_name,

                    'vendor_phone',
                    oi.vendor_phone,

                    'vendor_city',
                    oi.vendor_city

                  )

                  ORDER BY oi.id
                )

              FROM public.order_items oi

              WHERE oi.order_id = o.id
            ),

            '[]'::jsonb

          )

        )

        ORDER BY o.created_at DESC

      ),

      '[]'::jsonb
    )

  INTO _orders

  FROM public.orders o

  WHERE o.user_id = p_user_id;


  SELECT
    jsonb_build_object(

      'order_count',
      count(*),

      'total_spent',
      coalesce(
        sum(o.total),
        0
      ),

      'average_order_value',
      coalesce(
        avg(o.total),
        0
      ),

      'delivered_count',
      count(*)
        FILTER (
          WHERE o.status = 'delivered'
        ),

      'cancelled_count',
      count(*)
        FILTER (
          WHERE o.status = 'cancelled'
        )

    )

  INTO _metrics

  FROM public.orders o

  WHERE o.user_id = p_user_id;


  RETURN jsonb_build_object(

    'profile',
    _profile,

    'roles',
    _roles,

    'vendor',
    _vendor,

    'wallets',
    _wallets,

    'transactions',
    _transactions,

    'addresses',
    _addresses,

    'activity',
    _activity,

    'wishlist',
    _wishlist,

    'orders',
    _orders,

    'metrics',
    _metrics

  );

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_user_account_details(
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_get_user_account_details(
  uuid
)
TO authenticated;


-- ============================================================
-- 8. تفاصيل حساب التاجر
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_get_vendor_account_details(
  p_vendor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

  _vendor public.vendors%ROWTYPE;

  _profile jsonb;

  _wallets jsonb;

  _transactions jsonb;

  _activity jsonb;

  _products jsonb;

  _metrics jsonb;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  SELECT *
  INTO _vendor

  FROM public.vendors

  WHERE id = p_vendor_id;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المتجر غير موجود';
  END IF;


  SELECT
    coalesce(
      to_jsonb(p),
      '{}'::jsonb
    )

  INTO _profile

  FROM public.profiles p

  WHERE p.id =
    _vendor.user_id;


  SELECT
    coalesce(
      jsonb_agg(
        to_jsonb(w)
        ORDER BY w.currency
      ),
      '[]'::jsonb
    )

  INTO _wallets

  FROM public.wallets w

  WHERE w.user_id =
    _vendor.user_id;


  SELECT
    coalesce(
      jsonb_agg(
        jsonb_build_object(

          'id',
          wt.id,

          'amount',
          wt.amount,

          'balance_before',
          coalesce(
            wt.balance_before,
            0
          ),

          'balance_after',
          coalesce(
            wt.balance_after,
            0
          ),

          'currency',
          wt.currency,

          'transaction_type',
          coalesce(
            wt.transaction_type,
            wt.kind,
            ''
          ),

          'description',
          coalesce(
            wt.description,
            ''
          ),

          'created_at',
          wt.created_at

        )
        ORDER BY wt.created_at DESC
      ),
      '[]'::jsonb
    )

  INTO _transactions

  FROM public.wallet_transactions wt

  WHERE wt.user_id =
    _vendor.user_id;


  SELECT
    coalesce(
      to_jsonb(a),
      '{}'::jsonb
    )

  INTO _activity

  FROM public.user_activity_profiles a

  WHERE a.user_id =
    _vendor.user_id;


  SELECT
    coalesce(
      jsonb_agg(
        to_jsonb(p)
        ORDER BY p.created_at DESC
      ),
      '[]'::jsonb
    )

  INTO _products

  FROM public.products p

  WHERE p.vendor_id =
    _vendor.id;


  SELECT
    jsonb_build_object(

      'order_item_count',
      count(*),

      'units_sold',
      coalesce(
        sum(oi.quantity),
        0
      ),

      'sales_value',
      coalesce(
        sum(
          oi.unit_price *
          oi.quantity
        ),
        0
      ),

      'distinct_orders',
      count(
        DISTINCT oi.order_id
      )

    )

  INTO _metrics

  FROM public.order_items oi

  WHERE oi.vendor_id =
    _vendor.id;


  RETURN jsonb_build_object(

    'vendor',
    to_jsonb(_vendor),

    'profile',
    _profile,

    'wallets',
    _wallets,

    'transactions',
    _transactions,

    'activity',
    _activity,

    'products',
    _products,

    'metrics',
    _metrics

  );

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_vendor_account_details(
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_get_vendor_account_details(
  uuid
)
TO authenticated;


-- ============================================================
-- 9. تحديث PostgREST
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
