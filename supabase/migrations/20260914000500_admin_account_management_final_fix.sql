BEGIN;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS kind text;

UPDATE public.wallet_transactions
SET kind = COALESCE(kind, transaction_type)
WHERE kind IS NULL;

CREATE INDEX IF NOT EXISTS wallet_transactions_user_created_idx
  ON public.wallet_transactions(user_id, created_at DESC);

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
  currency_code text := upper(trim(coalesce(p_currency, 'YER')));
  mode_code text := lower(trim(coalesce(p_mode, 'delta')));
  before_balance numeric(14,2);
  after_balance numeric(14,2);
  delta_amount numeric(14,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;

  IF currency_code NOT IN ('YER','SAR') THEN
    RAISE EXCEPTION 'العملة غير مدعومة';
  END IF;

  IF p_amount IS NULL OR p_amount = 'NaN'::numeric THEN
    RAISE EXCEPTION 'قيمة الرصيد غير صالحة';
  END IF;

  IF mode_code NOT IN ('delta','set') THEN
    RAISE EXCEPTION 'وضع تعديل الرصيد غير صالح';
  END IF;

  PERFORM public.ensure_wallet(p_user_id, currency_code);

  SELECT * INTO w
  FROM public.wallets
  WHERE user_id = p_user_id AND currency = currency_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر الوصول إلى المحفظة';
  END IF;

  before_balance := round(coalesce(w.balance,0),2);

  IF mode_code = 'set' THEN
    after_balance := round(p_amount,2);
    delta_amount := after_balance - before_balance;
  ELSE
    delta_amount := round(p_amount,2);
    after_balance := before_balance + delta_amount;
  END IF;

  IF after_balance < 0 THEN
    RAISE EXCEPTION 'لا يمكن أن يصبح رصيد المحفظة سالباً';
  END IF;

  UPDATE public.wallets
  SET balance = after_balance, updated_at = now()
  WHERE id = w.id
  RETURNING * INTO w;

  IF delta_amount <> 0 THEN
    INSERT INTO public.wallet_transactions(
      wallet_id, user_id, currency, transaction_type, kind,
      amount, balance_before, balance_after, description,
      reference_type, reference_id, created_by, created_at
    )
    VALUES(
      w.id,
      p_user_id,
      currency_code,
      CASE WHEN delta_amount > 0 THEN 'credit' ELSE 'debit' END,
      CASE WHEN delta_amount > 0 THEN 'credit' ELSE 'debit' END,
      abs(delta_amount),
      before_balance,
      after_balance,
      left(coalesce(nullif(trim(p_reason),''),'تعديل رصيد من الإدارة'),500),
      'admin_adjustment',
      gen_random_uuid(),
      auth.uid(),
      now()
    );
  END IF;

  RETURN w;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_wallet_balance(uuid,text,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_wallet_balance(uuid,text,numeric,text,text) TO authenticated;

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
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المستخدم مطلوب';
  END IF;
  IF p_user_id = auth.uid() AND coalesce(p_disabled,false) THEN
    RAISE EXCEPTION 'لا يمكنك تعطيل حساب الإدارة الحالي';
  END IF;
  UPDATE public.profiles
  SET is_disabled = coalesce(p_disabled,false), updated_at = now()
  WHERE id = p_user_id
  RETURNING * INTO p;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;
  RETURN p;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_disabled(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_disabled(uuid,boolean) TO authenticated;

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
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION 'معرّف المتجر مطلوب';
  END IF;
  UPDATE public.vendors
  SET is_active = coalesce(p_enabled,false),
      account_enabled = coalesce(p_enabled,false)
  WHERE id = p_vendor_id
  RETURNING * INTO v;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'المتجر غير موجود';
  END IF;
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_vendor_enabled(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_vendor_enabled(uuid,boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;


BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_user_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_data ORDER BY created_at DESC)
    FROM (
      SELECT p.created_at,
        jsonb_build_object(
          'id', p.id,
          'full_name', coalesce(p.full_name,''),
          'first_name', coalesce(p.first_name,''),
          'second_name', coalesce(p.second_name,''),
          'last_name', coalesce(p.last_name,''),
          'phone', p.phone,
          'contact_email', coalesce(p.contact_email,u.email),
          'province', coalesce(p.province,''),
          'wallet_balance', coalesce((select w.balance from public.wallets w where w.user_id=p.id and w.currency='YER' limit 1),0),
          'is_disabled', coalesce(p.is_disabled,false),
          'accepted_terms', coalesce(p.accepted_terms,false),
          'created_at', p.created_at,
          'roles', coalesce((select jsonb_agg(ur.role::text order by ur.role::text) from public.user_roles ur where ur.user_id=p.id),'[]'::jsonb),
          'vendor', (select to_jsonb(v) from public.vendors v where v.user_id=p.id limit 1)
        ) AS row_data
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id=p.id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id=p.id AND ur.role::text IN ('admin','super_admin')
      )
    ) q
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_user_accounts() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_vendor_accounts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_data ORDER BY created_at DESC)
    FROM (
      SELECT v.created_at,
        jsonb_build_object(
          'id',v.id,
          'user_id',v.user_id,
          'name',coalesce(v.name,''),
          'city',coalesce(v.city,''),
          'phone',coalesce(v.phone,''),
          'logo_url',v.logo_url,
          'description',coalesce(v.description,''),
          'is_active',coalesce(v.is_active,false),
          'account_enabled',coalesce(v.account_enabled,false),
          'created_at',v.created_at,
          'product_count',(select count(*) from public.products p where p.vendor_id=v.id),
          'owner',(select jsonb_build_object(
            'id',p.id,
            'full_name',coalesce(p.full_name,''),
            'phone',p.phone,
            'contact_email',coalesce(p.contact_email,u.email),
            'province',coalesce(p.province,''),
            'is_disabled',coalesce(p.is_disabled,false),
            'created_at',p.created_at
          ) from public.profiles p left join auth.users u on u.id=p.id where p.id=v.user_id)
        ) AS row_data
      FROM public.vendors v
    ) q
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_vendor_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_vendor_accounts() TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
