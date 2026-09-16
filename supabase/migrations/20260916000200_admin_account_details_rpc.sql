BEGIN;

-- ============================================================
-- SHEHARA
-- ADMIN ACCOUNT DETAILS RPC
-- 20260916000200
--
-- هذه Migration مستقلة وصغيرة لتجنب مشكلة:
-- unterminated dollar-quoted string
--
-- تنشئ:
-- 1. admin_get_user_account_details
-- 2. admin_get_vendor_account_details
--
-- ولا تعتمد على Migration ضخمة.
-- ============================================================


-- ============================================================
-- 1. USER ACCOUNT DETAILS
-- ============================================================

DROP FUNCTION IF EXISTS
public.admin_get_user_account_details(uuid);


CREATE OR REPLACE FUNCTION
public.admin_get_user_account_details(
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

  -- ----------------------------------------------------------
  -- Security
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- ----------------------------------------------------------
  -- Validate UUID
  -- ----------------------------------------------------------

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;


  -- ----------------------------------------------------------
  -- Validate user
  -- ----------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
  ) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;


  -- ----------------------------------------------------------
  -- Build complete account object
  -- ----------------------------------------------------------

  SELECT jsonb_build_object(

    -- ========================================================
    -- PERSONAL DATA
    -- ========================================================

    'profile',
    (
      SELECT jsonb_build_object(

        'id',
        p.id,

        'full_name',
        COALESCE(p.full_name, ''),

        'first_name',
        COALESCE(p.first_name, ''),

        'second_name',
        COALESCE(p.second_name, ''),

        'last_name',
        COALESCE(p.last_name, ''),

        'phone',
        p.phone,

        'contact_email',
        COALESCE(
          p.contact_email,
          u.email
        ),

        'province',
        COALESCE(p.province, ''),

        'wallet_balance',
        COALESCE(
          (
            SELECT w.balance
            FROM public.wallets w
            WHERE w.user_id = p.id
              AND w.currency = 'YER'
            LIMIT 1
          ),
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


    -- ========================================================
    -- ROLES
    -- ========================================================

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


    -- ========================================================
    -- VENDOR
    -- ========================================================

    'vendor',
    (
      SELECT to_jsonb(v)
      FROM public.vendors v
      WHERE v.user_id = p_user_id
      LIMIT 1
    ),


    -- ========================================================
    -- WALLETS
    -- ========================================================

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


    -- ========================================================
    -- WALLET TRANSACTIONS
    -- ========================================================

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
              ''
            ),

            'kind',
            COALESCE(
              wt.kind,
              ''
            ),

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
            COALESCE(
              wt.description,
              ''
            ),

            'reason',
            COALESCE(
              wt.reason,
              wt.description,
              ''
            ),

            'created_at',
            wt.created_at

          )
          ORDER BY wt.created_at DESC
        )

        FROM public.wallet_transactions wt

        WHERE wt.user_id = p_user_id
      ),
      '[]'::jsonb
    ),


    -- ========================================================
    -- ADDRESSES
    -- ========================================================

    'addresses',
    COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(a)
          ORDER BY a.created_at DESC
        )
        FROM public.addresses a
        WHERE a.user_id = p_user_id
      ),
      '[]'::jsonb
    ),


    -- ========================================================
    -- TECHNICAL / LOCATION / SESSION DATA
    -- ========================================================

    'activity',
    COALESCE(
      (
        SELECT to_jsonb(ua)
        FROM public.user_activity_profiles ua
        WHERE ua.user_id = p_user_id
        LIMIT 1
      ),
      '{}'::jsonb
    ),


    -- ========================================================
    -- WISHLIST
    -- ========================================================

    'wishlist',
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(

            'id',
            wi.id,

            'product_id',
            wi.product_id,

            'created_at',
            wi.created_at,

            'product',
            CASE
              WHEN p.id IS NULL
              THEN NULL
              ELSE to_jsonb(p)
            END

          )
          ORDER BY wi.created_at DESC
        )

        FROM public.wishlists wi

        LEFT JOIN public.products p
          ON p.id = wi.product_id

        WHERE wi.user_id = p_user_id
      ),
      '[]'::jsonb
    ),


    -- ========================================================
    -- ORDERS
    -- ========================================================

    'orders',
    COALESCE(
      (
        SELECT jsonb_agg(
          order_data
          ORDER BY order_created_at DESC
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
                    ORDER BY oi.created_at
                  )
                  FROM public.order_items oi
                  WHERE oi.order_id = o.id
                ),
                '[]'::jsonb
              )

            ) AS order_data

          FROM public.orders o

          WHERE o.user_id = p_user_id

        ) q
      ),
      '[]'::jsonb
    ),


    -- ========================================================
    -- METRICS
    -- ========================================================

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
            COALESCE(o.total, 0)
          )
          FROM public.orders o
          WHERE o.user_id = p_user_id
            AND COALESCE(o.status::text, '') <> 'cancelled'
        ),
        0
      ),

      'average_order_value',
      COALESCE(
        (
          SELECT avg(
            COALESCE(o.total, 0)
          )
          FROM public.orders o
          WHERE o.user_id = p_user_id
            AND COALESCE(o.status::text, '') <> 'cancelled'
        ),
        0
      ),

      'delivered_count',
      (
        SELECT count(*)
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND o.status::text = 'delivered'
      ),

      'cancelled_count',
      (
        SELECT count(*)
        FROM public.orders o
        WHERE o.user_id = p_user_id
          AND o.status::text = 'cancelled'
      )

    )

  )
  INTO result;


  RETURN COALESCE(
    result,
    '{}'::jsonb
  );

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_user_account_details(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_get_user_account_details(uuid)
TO authenticated;


-- ============================================================
-- 2. VENDOR ACCOUNT DETAILS
-- ============================================================

DROP FUNCTION IF EXISTS
public.admin_get_vendor_account_details(uuid);


CREATE OR REPLACE FUNCTION
public.admin_get_vendor_account_details(
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

  -- ----------------------------------------------------------
  -- Security
  -- ----------------------------------------------------------

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;


  -- ----------------------------------------------------------
  -- Validate vendor ID
  -- ----------------------------------------------------------

  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المتجر مطلوب';
  END IF;


  -- ----------------------------------------------------------
  -- Build vendor object
  -- ----------------------------------------------------------

  SELECT jsonb_build_object(

    -- ========================================================
    -- STORE
    -- ========================================================

    'vendor',
    to_jsonb(v),


    -- ========================================================
    -- OWNER PROFILE
    -- ========================================================

    'profile',
    (
      SELECT jsonb_build_object(

        'id',
        p.id,

        'full_name',
        COALESCE(p.full_name, ''),

        'phone',
        p.phone,

        'contact_email',
        COALESCE(
          p.contact_email,
          u.email
        ),

        'province',
        COALESCE(p.province, ''),

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


    -- ========================================================
    -- OWNER WALLETS
    -- ========================================================

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


    -- ========================================================
    -- TRANSACTIONS
    -- ========================================================

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
              ''
            ),

            'kind',
            COALESCE(
              wt.kind,
              ''
            ),

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
            COALESCE(
              wt.description,
              ''
            ),

            'reason',
            COALESCE(
              wt.reason,
              wt.description,
              ''
            ),

            'created_at',
            wt.created_at

          )
          ORDER BY wt.created_at DESC
        )

        FROM public.wallet_transactions wt

        WHERE wt.user_id = v.user_id
      ),
      '[]'::jsonb
    ),


    -- ========================================================
    -- ACTIVITY
    -- ========================================================

    'activity',
    COALESCE(
      (
        SELECT to_jsonb(ua)
        FROM public.user_activity_profiles ua
        WHERE ua.user_id = v.user_id
        LIMIT 1
      ),
      '{}'::jsonb
    ),


    -- ========================================================
    -- PRODUCTS
    -- ========================================================

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


    -- ========================================================
    -- METRICS
    -- ========================================================

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
            COALESCE(oi.quantity, 0)
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
            COALESCE(oi.unit_price, 0)
            *
            COALESCE(oi.quantity, 0)
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


  IF result IS NULL THEN
    RAISE EXCEPTION 'المتجر غير موجود';
  END IF;


  RETURN result;

END;
$$;


REVOKE ALL
ON FUNCTION public.admin_get_vendor_account_details(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_get_vendor_account_details(uuid)
TO authenticated;


-- ============================================================
-- 3. POSTGREST CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
