BEGIN;

-- ============================================================
-- SHEHARA
-- ADMIN ACCOUNT MANAGEMENT - REAL DATABASE API
-- ============================================================


-- ============================================================
-- 1. قائمة حسابات المستخدمين
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_user_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        row_data
        ORDER BY created_at DESC
      )

      FROM (
        SELECT
          p.created_at,

          jsonb_build_object(

            'id',
            p.id,

            'full_name',
            COALESCE(
              p.full_name,
              ''
            ),

            'first_name',
            COALESCE(
              p.first_name,
              ''
            ),

            'second_name',
            COALESCE(
              p.second_name,
              ''
            ),

            'last_name',
            COALESCE(
              p.last_name,
              ''
            ),

            'phone',
            p.phone,

            'contact_email',
            COALESCE(
              p.contact_email,
              u.email
            ),

            'province',
            COALESCE(
              p.province,
              ''
            ),

            'wallet_balance',
            COALESCE(
              p.wallet_balance,
              0
            ),

            'is_disabled',
            COALESCE(
              p.is_disabled,
              false
            ),

            'accepted_terms',
            COALESCE(
              p.accepted_terms,
              false
            ),

            'created_at',
            p.created_at,

            'roles',
            COALESCE(
              (
                SELECT jsonb_agg(
                  ur.role::text
                  ORDER BY ur.role::text
                )

                FROM public.user_roles ur

                WHERE ur.user_id = p.id
              ),
              '[]'::jsonb
            ),

            'vendor',
            (
              SELECT to_jsonb(v)

              FROM public.vendors v

              WHERE v.user_id = p.id

              LIMIT 1
            )

          ) AS row_data

        FROM public.profiles p

        LEFT JOIN auth.users u
          ON u.id = p.id
      ) q
    ),
    '[]'::jsonb
  );

END;
$$;


-- ============================================================
-- 2. قائمة حسابات التجار
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_list_vendor_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  RETURN COALESCE(
    (
      SELECT jsonb_agg(
        row_data
        ORDER BY created_at DESC
      )

      FROM (
        SELECT
          v.created_at,

          jsonb_build_object(

            'id',
            v.id,

            'user_id',
            v.user_id,

            'name',
            COALESCE(
              v.name,
              ''
            ),

            'city',
            COALESCE(
              v.city,
              ''
            ),

            'phone',
            COALESCE(
              v.phone,
              ''
            ),

            'logo_url',
            v.logo_url,

            'description',
            COALESCE(
              v.description,
              ''
            ),

            'is_active',
            COALESCE(
              v.is_active,
              false
            ),

            'account_enabled',
            COALESCE(
              v.account_enabled,
              false
            ),

            'created_at',
            v.created_at,

            'product_count',
            (
              SELECT count(*)

              FROM public.products p

              WHERE p.vendor_id = v.id
            ),

            'owner',
            (
              SELECT jsonb_build_object(

                'id',
                p.id,

                'full_name',
                COALESCE(
                  p.full_name,
                  ''
                ),

                'phone',
                p.phone,

                'contact_email',
                COALESCE(
                  p.contact_email,
                  u.email
                ),

                'province',
                COALESCE(
                  p.province,
                  ''
                ),

                'is_disabled',
                COALESCE(
                  p.is_disabled,
                  false
                ),

                'created_at',
                p.created_at

              )

              FROM public.profiles p

              LEFT JOIN auth.users u
                ON u.id = p.id

              WHERE p.id = v.user_id
            )

          ) AS row_data

        FROM public.vendors v

      ) q
    ),
    '[]'::jsonb
  );

END;
$$;


-- ============================================================
-- 3. تعديل المحفظة
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

  w public.wallets%ROWTYPE;

  currency_code text :=
    upper(
      trim(
        coalesce(
          p_currency,
          'YER'
        )
      )
    );

  mode_code text :=
    lower(
      trim(
        coalesce(
          p_mode,
          'delta'
        )
      )
    );

  before_balance numeric(14,2);

  after_balance numeric(14,2);

  delta_amount numeric(14,2);

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;


  IF currency_code NOT IN (
    'YER',
    'SAR'
  )
  THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;


  IF p_amount IS NULL
     OR p_amount = 'NaN'::numeric
  THEN
    RAISE EXCEPTION 'قيمة الرصيد غير صالحة';
  END IF;


  IF mode_code NOT IN (
    'delta',
    'set'
  )
  THEN
    RAISE EXCEPTION 'وضع تعديل الرصيد غير صالح';
  END IF;


  PERFORM public.ensure_wallet(
    p_user_id,
    currency_code
  );


  SELECT *
  INTO w

  FROM public.wallets

  WHERE user_id = p_user_id

    AND currency = currency_code

  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر الوصول إلى المحفظة';
  END IF;


  before_balance :=
    round(
      coalesce(
        w.balance,
        0
      ),
      2
    );


  IF mode_code = 'set' THEN

    after_balance :=
      round(
        p_amount,
        2
      );

    delta_amount :=
      after_balance -
      before_balance;

  ELSE

    delta_amount :=
      round(
        p_amount,
        2
      );

    after_balance :=
      before_balance +
      delta_amount;

  END IF;


  IF after_balance < 0 THEN
    RAISE EXCEPTION
      'لا يمكن أن يصبح رصيد المحفظة سالباً';
  END IF;


  UPDATE public.wallets

  SET
    balance = after_balance,
    updated_at = now()

  WHERE id = w.id

  RETURNING *
  INTO w;


  IF delta_amount <> 0 THEN

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
      created_by,
      created_at

    )

    VALUES(

      w.id,

      p_user_id,

      currency_code,

      CASE
        WHEN delta_amount > 0
        THEN 'credit'
        ELSE 'debit'
      END,

      CASE
        WHEN delta_amount > 0
        THEN 'credit'
        ELSE 'debit'
      END,

      abs(
        delta_amount
      ),

      before_balance,

      after_balance,

      left(
        coalesce(
          nullif(
            trim(
              p_reason
            ),
            ''
          ),
          'تعديل رصيد من الإدارة'
        ),
        500
      ),

      'admin_adjustment',

      gen_random_uuid(),

      auth.uid(),

      now()
    );

  END IF;


  RETURN w;

END;
$$;


-- ============================================================
-- 4. تفاصيل المستخدم الكاملة
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

  result jsonb;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  IF p_user_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.id = p_user_id
     )
  THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  SELECT jsonb_build_object(

    -- --------------------------------------------------------
    -- بيانات الحساب
    -- --------------------------------------------------------

    'profile',

    (
      SELECT jsonb_build_object(

        'id',
        p.id,

        'full_name',
        COALESCE(
          p.full_name,
          ''
        ),

        'first_name',
        COALESCE(
          p.first_name,
          ''
        ),

        'second_name',
        COALESCE(
          p.second_name,
          ''
        ),

        'last_name',
        COALESCE(
          p.last_name,
          ''
        ),

        'phone',
        p.phone,

        'contact_email',
        COALESCE(
          p.contact_email,
          u.email
        ),

        'province',
        COALESCE(
          p.province,
          ''
        ),

        'wallet_balance',
        COALESCE(
          p.wallet_balance,
          0
        ),

        'is_disabled',
        COALESCE(
          p.is_disabled,
          false
        ),

        'accepted_terms',
        COALESCE(
          p.accepted_terms,
          false
        ),

        'created_at',
        p.created_at

      )

      FROM public.profiles p

      LEFT JOIN auth.users u
        ON u.id = p.id

      WHERE p.id = p_user_id
    ),


    -- --------------------------------------------------------
    -- الصلاحيات
    -- --------------------------------------------------------

    'roles',

    COALESCE(

      (
        SELECT jsonb_agg(
          ur.role::text
          ORDER BY ur.role::text
        )

        FROM public.user_roles ur

        WHERE ur.user_id = p_user_id
      ),

      '[]'::jsonb

    ),


    -- --------------------------------------------------------
    -- المتجر المرتبط
    -- --------------------------------------------------------

    'vendor',

    (
      SELECT to_jsonb(v)

      FROM public.vendors v

      WHERE v.user_id = p_user_id

      LIMIT 1
    ),


    -- --------------------------------------------------------
    -- المحافظ
    -- --------------------------------------------------------

    'wallets',

    COALESCE(

      (
        SELECT jsonb_agg(
          to_jsonb(w)
          ORDER BY w.currency
        )

        FROM public.wallets w

        WHERE w.user_id = p_user_id
      ),

      '[]'::jsonb

    ),


    -- --------------------------------------------------------
    -- سجل المحفظة
    -- --------------------------------------------------------

    'transactions',

    COALESCE(

      (
        SELECT jsonb_agg(

          jsonb_build_object(

            'id',
            wt.id,

            'wallet_id',
            wt.wallet_id,

            'user_id',
            wt.user_id,

            'currency',
            wt.currency,

            'transaction_type',
            COALESCE(
              wt.transaction_type,
              wt.kind,
              ''
            ),

            'kind',
            wt.kind,

            'amount',
            COALESCE(
              wt.amount,
              0
            ),

            'balance_before',
            COALESCE(
              wt.balance_before,
              0
            ),

            'balance_after',
            COALESCE(
              wt.balance_after,
              0
            ),

            'description',
            wt.description,

            'reason',
            COALESCE(
              wt.reason,
              wt.description,
              ''
            ),

            'created_at',
            wt.created_at

          )

          ORDER BY
            wt.created_at DESC

        )

        FROM public.wallet_transactions wt

        WHERE wt.user_id = p_user_id

      ),

      '[]'::jsonb

    ),


    -- --------------------------------------------------------
    -- عناوين العميل
    -- --------------------------------------------------------

    'addresses',

    COALESCE(

      (
        SELECT jsonb_agg(
          to_jsonb(a)
        )

        FROM public.addresses a

        WHERE a.user_id = p_user_id
      ),

      '[]'::jsonb

    ),


    -- --------------------------------------------------------
    -- النشاط التقني
    -- --------------------------------------------------------

    'activity',

    COALESCE(

      (
        SELECT to_jsonb(ua)

        FROM public.user_activity_profiles ua

        WHERE ua.user_id = p_user_id
      ),

      '{}'::jsonb

    ),


    -- --------------------------------------------------------
    -- المفضلة
    -- --------------------------------------------------------

    'wishlist',

    COALESCE(

      (
        SELECT jsonb_agg(

          jsonb_build_object(

            'id',
            w.id,

            'product_id',
            w.product_id,

            'created_at',
            w.created_at,

            'product',
            to_jsonb(p)

          )

        )

        FROM public.wishlists w

        LEFT JOIN public.products p
          ON p.id = w.product_id

        WHERE w.user_id = p_user_id

      ),

      '[]'::jsonb

    ),


    -- --------------------------------------------------------
    -- الطلبات
    -- --------------------------------------------------------

    'orders',

    COALESCE(

      (
        SELECT jsonb_agg(

          order_row

          ORDER BY
            order_created_at DESC

        )

        FROM (

          SELECT

            o.created_at AS order_created_at,

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

              COALESCE(

                (
                  SELECT jsonb_agg(
                    to_jsonb(oi)
                  )

                  FROM public.order_items oi

                  WHERE oi.order_id = o.id
                ),

                '[]'::jsonb

              )

            ) AS order_row

          FROM public.orders o

          WHERE o.user_id = p_user_id

        ) q

      ),

      '[]'::jsonb

    ),


    -- --------------------------------------------------------
    -- مؤشرات العميل
    -- --------------------------------------------------------

    'metrics',

    jsonb_build_object(

      'order_count',

      (
        SELECT count(*)

        FROM public.orders o

        WHERE o.user_id = p_user_id
      ),


      'total_spent',

      COALESCE(

        (
          SELECT sum(
            o.total
          )

          FROM public.orders o

          WHERE o.user_id = p_user_id

            AND o.status <> 'cancelled'
        ),

        0
      ),


      'average_order_value',

      COALESCE(

        (
          SELECT avg(
            o.total
          )

          FROM public.orders o

          WHERE o.user_id = p_user_id

            AND o.status <> 'cancelled'
        ),

        0
      ),


      'delivered_count',

      (
        SELECT count(*)

        FROM public.orders o

        WHERE o.user_id = p_user_id

          AND o.status = 'delivered'
      ),


      'cancelled_count',

      (
        SELECT count(*)

        FROM public.orders o

        WHERE o.user_id = p_user_id

          AND o.status = 'cancelled'
      )

    )

  )

  INTO result;


  RETURN result;

END;
$$;


-- ============================================================
-- 5. تفاصيل التاجر الكاملة
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

  result jsonb;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  IF p_vendor_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.vendors v
       WHERE v.id = p_vendor_id
     )
  THEN
    RAISE EXCEPTION 'المتجر غير موجود';
  END IF;


  SELECT jsonb_build_object(

    'vendor',
    to_jsonb(v),


    'profile',

    (
      SELECT jsonb_build_object(

        'id',
        p.id,

        'full_name',
        COALESCE(
          p.full_name,
          ''
        ),

        'phone',
        p.phone,

        'contact_email',
        COALESCE(
          p.contact_email,
          u.email
        ),

        'province',
        COALESCE(
          p.province,
          ''
        ),

        'is_disabled',
        COALESCE(
          p.is_disabled,
          false
        ),

        'created_at',
        p.created_at

      )

      FROM public.profiles p

      LEFT JOIN auth.users u
        ON u.id = p.id

      WHERE p.id = v.user_id
    ),


    'wallets',

    COALESCE(

      (
        SELECT jsonb_agg(
          to_jsonb(w)
          ORDER BY w.currency
        )

        FROM public.wallets w

        WHERE w.user_id = v.user_id
      ),

      '[]'::jsonb

    ),


    'transactions',

    COALESCE(

      (
        SELECT jsonb_agg(
          to_jsonb(wt)
          ORDER BY wt.created_at DESC
        )

        FROM public.wallet_transactions wt

        WHERE wt.user_id = v.user_id
      ),

      '[]'::jsonb

    ),


    'activity',

    COALESCE(

      (
        SELECT to_jsonb(ua)

        FROM public.user_activity_profiles ua

        WHERE ua.user_id = v.user_id
      ),

      '{}'::jsonb

    ),


    'products',

    COALESCE(

      (
        SELECT jsonb_agg(
          to_jsonb(p)
          ORDER BY p.created_at DESC
        )

        FROM public.products p

        WHERE p.vendor_id = v.id
      ),

      '[]'::jsonb

    ),


    'metrics',

    jsonb_build_object(

      'product_count',

      (
        SELECT count(*)

        FROM public.products p

        WHERE p.vendor_id = v.id
      ),


      'order_item_count',

      (
        SELECT count(*)

        FROM public.order_items oi

        WHERE oi.vendor_id = v.id
      ),


      'units_sold',

      COALESCE(

        (
          SELECT sum(
            oi.quantity
          )

          FROM public.order_items oi

          WHERE oi.vendor_id = v.id
        ),

        0
      ),


      'sales_value',

      COALESCE(

        (
          SELECT sum(
            oi.unit_price *
            oi.quantity
          )

          FROM public.order_items oi

          WHERE oi.vendor_id = v.id
        ),

        0
      ),


      'distinct_orders',

      (
        SELECT count(
          DISTINCT oi.order_id
        )

        FROM public.order_items oi

        WHERE oi.vendor_id = v.id
      )

    )

  )

  INTO result

  FROM public.vendors v

  WHERE v.id = p_vendor_id;


  RETURN result;

END;
$$;


-- ============================================================
-- 6. تعطيل / تفعيل المستخدم
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

  p public.profiles%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
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

  INTO p;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  RETURN p;

END;
$$;


-- ============================================================
-- 7. تفعيل / تعطيل المتجر
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

  v public.vendors%ROWTYPE;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
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

  INTO v;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'المتجر غير موجود';
  END IF;


  RETURN v;

END;
$$;


-- ============================================================
-- 8. تعديل بيانات العميل
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

  p public.profiles%ROWTYPE;

  new_full_name text;

BEGIN

  IF auth.uid() IS NULL
     OR NOT public.has_role(
       auth.uid(),
       'admin'
     )
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  SELECT *

  INTO p

  FROM public.profiles

  WHERE id = p_user_id

  FOR UPDATE;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  new_full_name :=
    concat_ws(
      ' ',

      nullif(
        trim(
          coalesce(
            p_first_name,
            ''
          )
        ),
        ''
      ),

      nullif(
        trim(
          coalesce(
            p_second_name,
            ''
          )
        ),
        ''
      ),

      nullif(
        trim(
          coalesce(
            p_last_name,
            ''
          )
        ),
        ''
      )
    );


  UPDATE public.profiles

  SET

    first_name =
      coalesce(
        nullif(
          trim(
            p_first_name
          ),
          ''
        ),
        first_name
      ),

    second_name =
      coalesce(
        nullif(
          trim(
            p_second_name
          ),
          ''
        ),
        second_name
      ),

    last_name =
      coalesce(
        nullif(
          trim(
            p_last_name
          ),
          ''
        ),
        last_name
      ),

    full_name =
      coalesce(
        nullif(
          new_full_name,
          ''
        ),
        full_name
      ),

    phone =
      coalesce(
        nullif(
          trim(
            p_phone
          ),
          ''
        ),
        phone
      ),

    contact_email =
      coalesce(
        nullif(
          trim(
            p_contact_email
          ),
          ''
        ),
        contact_email
      ),

    province =
      coalesce(
        nullif(
          trim(
            p_province
          ),
          ''
        ),
        province
      ),

    updated_at =
      now()

  WHERE id = p_user_id

  RETURNING *

  INTO p;


  RETURN p;

END;
$$;


-- ============================================================
-- 9. الصلاحيات
-- ============================================================

REVOKE ALL
ON FUNCTION public.admin_list_user_accounts()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_list_vendor_accounts()
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_update_wallet_balance(
  uuid,
  text,
  numeric,
  text,
  text
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_get_user_account_details(
  uuid
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_get_vendor_account_details(
  uuid
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_set_user_disabled(
  uuid,
  boolean
)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.admin_set_vendor_enabled(
  uuid,
  boolean
)
FROM PUBLIC;

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
ON FUNCTION public.admin_list_user_accounts()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_list_vendor_accounts()
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_update_wallet_balance(
  uuid,
  text,
  numeric,
  text,
  text
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_get_user_account_details(
  uuid
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_get_vendor_account_details(
  uuid
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_set_user_disabled(
  uuid,
  boolean
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.admin_set_vendor_enabled(
  uuid,
  boolean
)
TO authenticated;

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


NOTIFY pgrst, 'reload schema';

COMMIT;
