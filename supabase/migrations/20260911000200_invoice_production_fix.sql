BEGIN;

-- ============================================================
-- SHEHARA
-- Production Invoice Fix
-- ============================================================

-- ------------------------------------------------------------
-- 1. الصلاحيات الأساسية للجدول
-- ------------------------------------------------------------

GRANT SELECT ON public.invoice_settings TO authenticated;
GRANT INSERT, UPDATE ON public.invoice_settings TO authenticated;


-- ------------------------------------------------------------
-- 2. التأكد من وجود السجل الرئيسي
-- ------------------------------------------------------------

INSERT INTO public.invoice_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 3. دالة آمنة لجلب الإعدادات
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_invoice_settings()
RETURNS public.invoice_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.invoice_settings;
BEGIN

  SELECT *
  INTO result
  FROM public.invoice_settings
  WHERE id = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'إعدادات الفاتورة غير موجودة';
  END IF;

  RETURN result;

END;
$$;


-- ------------------------------------------------------------
-- 4. دالة آمنة لتحديث الإعدادات
-- الإدارة فقط
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_invoice_settings(
  _settings jsonb
)
RETURNS public.invoice_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.invoice_settings;
BEGIN

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'غير مصرح لك بتعديل إعدادات الفاتورة';
  END IF;

  UPDATE public.invoice_settings
  SET
    enabled = COALESCE(
      (_settings->>'enabled')::boolean,
      enabled
    ),

    invoice_title = COALESCE(
      NULLIF(trim(_settings->>'invoice_title'), ''),
      invoice_title
    ),

    invoice_subtitle = COALESCE(
      NULLIF(trim(_settings->>'invoice_subtitle'), ''),
      invoice_subtitle
    ),

    store_name = COALESCE(
      NULLIF(trim(_settings->>'store_name'), ''),
      store_name
    ),

    store_tagline = COALESCE(
      _settings->>'store_tagline',
      store_tagline
    ),

    store_address = COALESCE(
      _settings->>'store_address',
      store_address
    ),

    store_phone = COALESCE(
      _settings->>'store_phone',
      store_phone
    ),

    store_email = COALESCE(
      _settings->>'store_email',
      store_email
    ),

    commercial_registration = COALESCE(
      _settings->>'commercial_registration',
      commercial_registration
    ),

    tax_number = COALESCE(
      _settings->>'tax_number',
      tax_number
    ),

    logo_url = COALESCE(
      _settings->>'logo_url',
      logo_url
    ),

    header_note = COALESCE(
      _settings->>'header_note',
      header_note
    ),

    footer_note = COALESCE(
      _settings->>'footer_note',
      footer_note
    ),

    thank_you_message = COALESCE(
      _settings->>'thank_you_message',
      thank_you_message
    ),

    primary_color = COALESCE(
      _settings->>'primary_color',
      primary_color
    ),

    secondary_color = COALESCE(
      _settings->>'secondary_color',
      secondary_color
    ),

    accent_color = COALESCE(
      _settings->>'accent_color',
      accent_color
    ),

    show_invoice_number = COALESCE(
      (_settings->>'show_invoice_number')::boolean,
      show_invoice_number
    ),

    show_order_number = COALESCE(
      (_settings->>'show_order_number')::boolean,
      show_order_number
    ),

    show_invoice_date = COALESCE(
      (_settings->>'show_invoice_date')::boolean,
      show_invoice_date
    ),

    show_customer_details = COALESCE(
      (_settings->>'show_customer_details')::boolean,
      show_customer_details
    ),

    show_customer_phone = COALESCE(
      (_settings->>'show_customer_phone')::boolean,
      show_customer_phone
    ),

    show_customer_address = COALESCE(
      (_settings->>'show_customer_address')::boolean,
      show_customer_address
    ),

    show_store_details = COALESCE(
      (_settings->>'show_store_details')::boolean,
      show_store_details
    ),

    show_commercial_registration = COALESCE(
      (_settings->>'show_commercial_registration')::boolean,
      show_commercial_registration
    ),

    show_tax_number = COALESCE(
      (_settings->>'show_tax_number')::boolean,
      show_tax_number
    ),

    show_product_images = COALESCE(
      (_settings->>'show_product_images')::boolean,
      show_product_images
    ),

    show_product_description = COALESCE(
      (_settings->>'show_product_description')::boolean,
      show_product_description
    ),

    show_payment_method = COALESCE(
      (_settings->>'show_payment_method')::boolean,
      show_payment_method
    ),

    show_payment_status = COALESCE(
      (_settings->>'show_payment_status')::boolean,
      show_payment_status
    ),

    show_notes = COALESCE(
      (_settings->>'show_notes')::boolean,
      show_notes
    ),

    show_qr_code = COALESCE(
      (_settings->>'show_qr_code')::boolean,
      show_qr_code
    ),

    show_delivery_fee = COALESCE(
      (_settings->>'show_delivery_fee')::boolean,
      show_delivery_fee
    ),

    show_discount = COALESCE(
      (_settings->>'show_discount')::boolean,
      show_discount
    ),

    paper_size = CASE
      WHEN _settings->>'paper_size' IN ('A4', 'thermal')
      THEN _settings->>'paper_size'
      ELSE paper_size
    END,

    invoice_prefix = COALESCE(
      NULLIF(trim(_settings->>'invoice_prefix'), ''),
      invoice_prefix
    ),

    invoice_footer_enabled = COALESCE(
      (_settings->>'invoice_footer_enabled')::boolean,
      invoice_footer_enabled
    ),

    updated_at = now()

  WHERE id = true

  RETURNING *
  INTO result;


  IF NOT FOUND THEN
    RAISE EXCEPTION 'تعذر تحديث إعدادات الفاتورة';
  END IF;


  RETURN result;

END;
$$;


-- ------------------------------------------------------------
-- 5. حماية RPC
-- ------------------------------------------------------------

REVOKE ALL
ON FUNCTION public.get_invoice_settings()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.get_invoice_settings()
TO authenticated;


REVOKE ALL
ON FUNCTION public.update_invoice_settings(jsonb)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.update_invoice_settings(jsonb)
TO authenticated;


-- ------------------------------------------------------------
-- 6. تشديد RLS
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "invoice_settings_select_authenticated"
ON public.invoice_settings;

CREATE POLICY "invoice_settings_select_authenticated"
ON public.invoice_settings
FOR SELECT
TO authenticated
USING (true);


DROP POLICY IF EXISTS "invoice_settings_admin_update"
ON public.invoice_settings;

CREATE POLICY "invoice_settings_admin_update"
ON public.invoice_settings
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


DROP POLICY IF EXISTS "invoice_settings_admin_insert"
ON public.invoice_settings;

CREATE POLICY "invoice_settings_admin_insert"
ON public.invoice_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());


COMMIT;
