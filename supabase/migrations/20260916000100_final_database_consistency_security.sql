BEGIN;

-- ============================================================
-- SHEHARA
-- FINAL DATABASE CONSISTENCY + SECURITY REPAIR
-- ============================================================
--
-- الهدف:
-- 1. توحيد بنية المحافظ.
-- 2. إصلاح wallet_transactions القديمة.
-- 3. إزالة تعارض دوال الإدارة.
-- 4. إنشاء API إدارة الحسابات بشكل موحد.
-- 5. منع إنشاء الطلبات مباشرة من العميل.
-- 6. منع كشف بيانات التجار الحساسة للعامة.
-- 7. إعادة تحميل PostgREST.
--
-- هذه Migration مصممة للعمل فوق قاعدة بيانات موجودة.
-- لا تحذف بيانات المستخدمين أو الطلبات.
-- ============================================================


-- ============================================================
-- 1. WALLET FOUNDATION
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id uuid NOT NULL
    REFERENCES auth.users(id)
    ON DELETE CASCADE,

  currency text NOT NULL,

  balance numeric(14,2) NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wallets_currency_check
    CHECK (currency IN ('YER','SAR')),

  CONSTRAINT wallets_balance_non_negative
    CHECK (balance >= 0),

  CONSTRAINT wallets_user_currency_unique
    UNIQUE (user_id,currency)
);


-- ============================================================
-- 2. WALLET TRANSACTIONS COMPATIBILITY
-- ============================================================

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS wallet_id uuid;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS currency text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS transaction_type text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS kind text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS amount numeric(14,2);

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_before numeric(14,2);

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_after numeric(14,2);

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reference_type text;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS reference_id uuid;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS created_at timestamptz;


-- ============================================================
-- 3. DEFAULTS
-- ============================================================

ALTER TABLE public.wallet_transactions
  ALTER COLUMN description SET DEFAULT '';

ALTER TABLE public.wallet_transactions
  ALTER COLUMN created_at SET DEFAULT now();


-- ============================================================
-- 4. CREATE MISSING WALLETS
-- ============================================================

INSERT INTO public.wallets (
  user_id,
  currency,
  balance
)
SELECT
  p.id,
  'YER',
  GREATEST(
    COALESCE(p.wallet_balance,0),
    0
  )
FROM public.profiles p
ON CONFLICT (user_id,currency)
DO NOTHING;


INSERT INTO public.wallets (
  user_id,
  currency,
  balance
)
SELECT
  p.id,
  'SAR',
  0
FROM public.profiles p
ON CONFLICT (user_id,currency)
DO NOTHING;


-- ============================================================
-- 5. LINK OLD WALLET TRANSACTIONS
-- ============================================================

UPDATE public.wallet_transactions wt
SET wallet_id = w.id
FROM public.wallets w
WHERE wt.wallet_id IS NULL
  AND wt.user_id = w.user_id
  AND upper(
    COALESCE(wt.currency,'YER')
  ) = w.currency;


-- ============================================================
-- 6. NORMALIZE OLD TRANSACTION DATA
-- ============================================================

UPDATE public.wallet_transactions
SET
  currency = COALESCE(
    NULLIF(upper(trim(currency)),''),
    'YER'
  )
WHERE currency IS NULL
   OR trim(currency) = '';


UPDATE public.wallet_transactions
SET
  transaction_type = COALESCE(
    NULLIF(trim(transaction_type),''),
    NULLIF(trim(kind),''),
    'adjustment'
  )
WHERE transaction_type IS NULL
   OR trim(transaction_type) = '';


UPDATE public.wallet_transactions
SET
  kind = COALESCE(
    NULLIF(trim(kind),''),
    transaction_type
  )
WHERE kind IS NULL
   OR trim(kind) = '';


UPDATE public.wallet_transactions
SET
  description = COALESCE(
    description,
    reason,
    ''
  )
WHERE description IS NULL;


UPDATE public.wallet_transactions
SET
  reason = COALESCE(
    reason,
    description,
    ''
  )
WHERE reason IS NULL;


UPDATE public.wallet_transactions
SET
  created_at = now()
WHERE created_at IS NULL;


-- ============================================================
-- 7. WALLET FK
-- ============================================================

DO $wallet_fk$
BEGIN

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'wallet_transactions_wallet_id_fkey'
      AND conrelid =
        'public.wallet_transactions'::regclass
  ) THEN

    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT
      wallet_transactions_wallet_id_fkey
      FOREIGN KEY (wallet_id)
      REFERENCES public.wallets(id)
      ON DELETE CASCADE;

  END IF;

END
$wallet_fk$;


-- ============================================================
-- 8. WALLET INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
wallets_user_idx
ON public.wallets(user_id);


CREATE INDEX IF NOT EXISTS
wallets_currency_idx
ON public.wallets(currency);


CREATE INDEX IF NOT EXISTS
wallet_transactions_user_created_idx
ON public.wallet_transactions(
  user_id,
  created_at DESC
);


CREATE INDEX IF NOT EXISTS
wallet_transactions_wallet_idx
ON public.wallet_transactions(wallet_id);


-- ============================================================
-- 9. ENSURE WALLET
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_wallet(
  p_user_id uuid,
  p_currency text
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $ensure_wallet$
DECLARE
  result_wallet public.wallets%ROWTYPE;
  currency_code text;
BEGIN

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المستخدم مطلوب';
  END IF;

  currency_code :=
    upper(
      trim(
        COALESCE(
          p_currency,
          'YER'
        )
      )
    );

  IF currency_code NOT IN ('YER','SAR') THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;

  INSERT INTO public.wallets (
    user_id,
    currency,
    balance
  )
  VALUES (
    p_user_id,
    currency_code,
    0
  )
  ON CONFLICT (
    user_id,
    currency
  )
  DO NOTHING;

  SELECT *
  INTO result_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
    AND currency = currency_code
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'تعذر إنشاء المحفظة';
  END IF;

  RETURN result_wallet;

END;
$ensure_wallet$;


-- ============================================================
-- 10. ADMIN WALLET FUNCTION
-- إزالة جميع النسخ المتعارضة
-- ============================================================

DROP FUNCTION IF EXISTS
public.admin_update_wallet_balance(
  uuid,
  text,
  numeric,
  text,
  text
);


DROP FUNCTION IF EXISTS
public.admin_update_wallet_balance(
  numeric,
  text,
  text,
  text,
  uuid
);


-- ============================================================
-- 11. ADMIN WALLET FUNCTION
-- التوقيع المتوافق مع الواجهة الحالية
-- ============================================================

CREATE FUNCTION public.admin_update_wallet_balance(
  p_amount numeric,
  p_currency text,
  p_mode text DEFAULT 'delta',
  p_reason text DEFAULT '',
  p_user_id uuid DEFAULT NULL
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $admin_wallet$
DECLARE

  w public.wallets%ROWTYPE;

  currency_code text :=
    upper(
      trim(
        COALESCE(
          p_currency,
          'YER'
        )
      )
    );

  mode_code text :=
    lower(
      trim(
        COALESCE(
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
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  IF p_user_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المستخدم مطلوب';
  END IF;


  IF currency_code NOT IN ('YER','SAR') THEN
    RAISE EXCEPTION
      'العملة غير مدعومة';
  END IF;


  IF p_amount IS NULL
     OR p_amount = 'NaN'::numeric
  THEN
    RAISE EXCEPTION
      'قيمة الرصيد غير صالحة';
  END IF;


  IF mode_code NOT IN ('delta','set') THEN
    RAISE EXCEPTION
      'وضع تعديل الرصيد غير صالح';
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
    RAISE EXCEPTION
      'تعذر الوصول إلى المحفظة';
  END IF;


  before_balance :=
    round(
      COALESCE(w.balance,0),
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

    INSERT INTO public.wallet_transactions (
      wallet_id,
      user_id,
      currency,
      transaction_type,
      kind,
      amount,
      balance_before,
      balance_after,
      description,
      reason,
      reference_type,
      reference_id,
      created_by,
      created_at
    )
    VALUES (
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

      abs(delta_amount),

      before_balance,
      after_balance,

      left(
        COALESCE(
          NULLIF(
            trim(p_reason),
            ''
          ),
          'تعديل رصيد من الإدارة'
        ),
        500
      ),

      left(
        COALESCE(
          NULLIF(
            trim(p_reason),
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
$admin_wallet$;


REVOKE ALL
ON FUNCTION public.admin_update_wallet_balance(
  numeric,
  text,
  text,
  text,
  uuid
)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.admin_update_wallet_balance(
  numeric,
  text,
  text,
  text,
  uuid
)
TO authenticated;


-- ============================================================
-- 12. USER ACCOUNT LIST
-- ============================================================

CREATE OR REPLACE FUNCTION
public.admin_list_user_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $list_users$
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
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

        WHERE NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = p.id
            AND ur.role::text IN (
              'admin',
              'super_admin'
            )
        )

      ) q
    ),
    '[]'::jsonb
  );

END;
$list_users$;


-- ============================================================
-- 13. VENDOR ACCOUNT LIST
-- ============================================================

CREATE OR REPLACE FUNCTION
public.admin_list_vendor_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $list_vendors$
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
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
$list_vendors$;


-- ============================================================
-- 14. USER DETAILS
-- ============================================================

CREATE OR REPLACE FUNCTION
public.admin_get_user_account_details(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $user_details$
DECLARE
  result jsonb;
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


  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION
      'المستخدم غير موجود';
  END IF;


  SELECT jsonb_build_object(

    'profile',
    (
      SELECT jsonb_build_object(

        'id',
        p.id,

        'full_name',
        COALESCE(p.full_name,''),

        'first_name',
        COALESCE(p.first_name,''),

        'second_name',
        COALESCE(p.second_name,''),

        'last_name',
        COALESCE(p.last_name,''),

        'phone',
        p.phone,

        'contact_email',
        COALESCE(
          p.contact_email,
          u.email
        ),

        'province',
        COALESCE(p.province,''),

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


    'vendor',
    (
      SELECT to_jsonb(v)
      FROM public.vendors v
      WHERE v.user_id = p_user_id
      LIMIT 1
    ),


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


    'activity',
    COALESCE(
      (
        SELECT to_jsonb(ua)
        FROM public.user_activity_profiles ua
        WHERE ua.user_id = p_user_id
      ),
      '{}'::jsonb
    ),


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
            to_jsonb(p)

          )
        )
        FROM public.wishlists wi

        LEFT JOIN public.products p
          ON p.id = wi.product_id

        WHERE wi.user_id = p_user_id
      ),
      '[]'::jsonb
    ),


    'orders',
    COALESCE(
      (
        SELECT jsonb_agg(
          order_row
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
          SELECT sum(o.total)
          FROM public.orders o
          WHERE o.user_id = p_user_id
            AND o.status <> 'cancelled'
        ),
        0
      ),

      'average_order_value',
      COALESCE(
        (
          SELECT avg(o.total)
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
$user_details$;


-- ============================================================
-- 15. VENDOR DETAILS
-- ============================================================

CREATE OR REPLACE FUNCTION
public.admin_get_vendor_account_details(
  p_vendor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $vendor_details$
DECLARE
  result jsonb;
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المتجر مطلوب';
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
        COALESCE(p.full_name,''),

        'phone',
        p.phone,

        'contact_email',
        COALESCE(
          p.contact_email,
          u.email
        ),

        'province',
        COALESCE(p.province,'')
        ,

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
            wt.transaction_type,

            'kind',
            wt.kind,

            'amount',
            COALESCE(wt.amount,0),

            'balance_before',
            COALESCE(wt.balance_before,0),

            'balance_after',
            COALESCE(wt.balance_after,0),

            'description',
            COALESCE(wt.description,''),

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
          SELECT sum(oi.quantity)
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


  IF result IS NULL THEN
    RAISE EXCEPTION
      'المتجر غير موجود';
  END IF;


  RETURN result;

END;
$vendor_details$;


-- ============================================================
-- 16. ACCOUNT STATE
-- ============================================================

CREATE OR REPLACE FUNCTION
public.admin_set_user_disabled(
  p_user_id uuid,
  p_disabled boolean
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $disable_user$
DECLARE
  p public.profiles%ROWTYPE;
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
     AND COALESCE(
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
      COALESCE(
        p_disabled,
        false
      ),

    updated_at =
      now()

  WHERE id = p_user_id

  RETURNING *
  INTO p;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المستخدم غير موجود';
  END IF;


  RETURN p;

END;
$disable_user$;


CREATE OR REPLACE FUNCTION
public.admin_set_vendor_enabled(
  p_vendor_id uuid,
  p_enabled boolean
)
RETURNS public.vendors
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $enable_vendor$
DECLARE
  v public.vendors%ROWTYPE;
BEGIN

  IF auth.uid() IS NULL
     OR NOT public.is_admin()
  THEN
    RAISE EXCEPTION
      'غير مصرح';
  END IF;


  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION
      'معرّف المتجر مطلوب';
  END IF;


  UPDATE public.vendors
  SET
    is_active =
      COALESCE(
        p_enabled,
        false
      ),

    account_enabled =
      COALESCE(
        p_enabled,
        false
      )

  WHERE id = p_vendor_id

  RETURNING *
  INTO v;


  IF NOT FOUND THEN
    RAISE EXCEPTION
      'المتجر غير موجود';
  END IF;


  RETURN v;

END;
$enable_vendor$;


-- ============================================================
-- 17. SECURE CHECKOUT ONLY
-- ============================================================

DO $drop_order_insert$
DECLARE
  policy_record record;
BEGIN

  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'orders'
      AND cmd = 'INSERT'
  LOOP

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.orders',
      policy_record.policyname
    );

  END LOOP;

END
$drop_order_insert$;


DO $drop_item_insert$
DECLARE
  policy_record record;
BEGIN

  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND cmd = 'INSERT'
  LOOP

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.order_items',
      policy_record.policyname
    );

  END LOOP;

END
$drop_item_insert$;


REVOKE INSERT
ON public.orders
FROM anon, authenticated;


REVOKE INSERT
ON public.order_items
FROM anon, authenticated;


-- ============================================================
-- 18. PUBLIC VENDOR DIRECTORY
-- لا يحتوي phone أو user_id أو بيانات داخلية
-- ============================================================

DROP POLICY IF EXISTS
vendors_public_read
ON public.vendors;


REVOKE SELECT
ON public.vendors
FROM anon;


DROP VIEW IF EXISTS
public.public_vendor_directory;


CREATE VIEW
public.public_vendor_directory
AS
SELECT
  id,
  name,
  city,
  logo_url,
  description
FROM public.vendors
WHERE
  is_active = true
  AND account_enabled = true;


GRANT SELECT
ON public.public_vendor_directory
TO anon, authenticated;


-- ============================================================
-- 19. PUBLIC VENDOR DIRECTORY INDEX
-- ============================================================

CREATE INDEX IF NOT EXISTS
vendors_public_active_idx
ON public.vendors(
  is_active,
  account_enabled
);


-- ============================================================
-- 20. SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';


COMMIT;
