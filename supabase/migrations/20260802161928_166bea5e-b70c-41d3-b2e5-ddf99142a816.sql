-- ===== helper =====
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== enum extension =====
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'awaiting_payment' BEFORE 'confirmed';

-- ===== settings =====
CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  store_name text NOT NULL DEFAULT 'تشكيلات',
  tagline text NOT NULL DEFAULT 'كل ما تحتاجه... في مكان واحد',
  logo_url text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  facebook text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  delivery_fee numeric NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_public_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY settings_admin_write ON public.site_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== pages =====
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY pages_public_read ON public.pages FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin());
CREATE POLICY pages_admin_write ON public.pages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER pages_touch BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== faqs =====
CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY faqs_public_read ON public.faqs FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY faqs_admin_write ON public.faqs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER faqs_touch BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== payment methods =====
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'wallet',
  display_name text NOT NULL,
  account_number text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  requires_receipt boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY pm_public_read ON public.payment_methods FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
CREATE POLICY pm_admin_write ON public.payment_methods FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER pm_touch BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== profiles: disable account =====
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== user_roles admin management =====
CREATE POLICY user_roles_admin_read ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY user_roles_admin_write ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== products / categories / vendors admin management =====
CREATE POLICY products_admin_all ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_admin_read_inactive ON public.products FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY categories_admin_all ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY vendors_admin_all ON public.vendors FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===== orders extension =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method_code text NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_district text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

CREATE POLICY orders_admin_read ON public.orders FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY orders_admin_delete ON public.orders FOR DELETE TO authenticated USING (public.is_admin());
CREATE POLICY order_items_admin_read ON public.order_items FOR SELECT TO authenticated USING (public.is_admin());
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== wallet transactions =====
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  kind text NOT NULL,
  description text NOT NULL DEFAULT '',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY wt_own_read ON public.wallet_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- ===== payment requests =====
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL DEFAULT 'order',
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  method_code text NOT NULL,
  amount numeric NOT NULL,
  sender_name text NOT NULL DEFAULT '',
  sender_phone text NOT NULL DEFAULT '',
  reference text NOT NULL DEFAULT '',
  receipt_path text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  admin_note text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_requests TO authenticated;
GRANT UPDATE ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY pr_own_read ON public.payment_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY pr_own_insert ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY pr_admin_update ON public.payment_requests FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE TRIGGER pr_touch BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== invoices =====
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1000;
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE DEFAULT ('INV-' || nextval('public.invoice_number_seq')::text),
  issued_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_read ON public.invoices FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = invoices.order_id AND o.user_id = auth.uid()));

-- auto invoice when order confirmed or beyond
CREATE OR REPLACE FUNCTION public.create_invoice_on_confirm()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('confirmed','processing','shipped','delivered') THEN
    INSERT INTO public.invoices (order_id, snapshot)
    VALUES (NEW.id, jsonb_build_object(
      'order_number', NEW.order_number,
      'total', NEW.total,
      'subtotal', NEW.subtotal,
      'delivery_fee', NEW.delivery_fee,
      'payment_method_code', NEW.payment_method_code,
      'shipping_name', NEW.shipping_name,
      'shipping_phone', NEW.shipping_phone,
      'shipping_city', NEW.shipping_city,
      'shipping_district', NEW.shipping_district,
      'shipping_details', NEW.shipping_details
    ))
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER orders_invoice AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_invoice_on_confirm();

-- ===== wallet payment =====
CREATE OR REPLACE FUNCTION public.pay_order_from_wallet(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.orders; _bal numeric;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id AND user_id = auth.uid();
  IF _o.id IS NULL THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;
  IF _o.payment_status = 'paid' THEN RETURN; END IF;
  SELECT wallet_balance INTO _bal FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF _bal < _o.total THEN RAISE EXCEPTION 'الرصيد غير كافٍ'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _o.total WHERE id = auth.uid();
  INSERT INTO public.wallet_transactions (user_id, amount, kind, description, order_id)
  VALUES (auth.uid(), -_o.total, 'order_payment', 'دفع الطلب ' || _o.order_number, _o.id);
  UPDATE public.orders SET payment_status = 'paid', status = 'confirmed' WHERE id = _order_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.pay_order_from_wallet(uuid) TO authenticated;

-- ===== admin review of payment requests =====
CREATE OR REPLACE FUNCTION public.review_payment_request(_id uuid, _approve boolean, _note text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.payment_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  SELECT * INTO _r FROM public.payment_requests WHERE id = _id FOR UPDATE;
  IF _r.id IS NULL OR _r.status <> 'pending' THEN RAISE EXCEPTION 'العملية غير متاحة'; END IF;

  IF _approve THEN
    IF _r.purpose = 'topup' THEN
      UPDATE public.profiles SET wallet_balance = wallet_balance + _r.amount WHERE id = _r.user_id;
      INSERT INTO public.wallet_transactions (user_id, amount, kind, description)
      VALUES (_r.user_id, _r.amount, 'topup', 'شحن رصيد عبر ' || _r.method_code);
    ELSE
      UPDATE public.orders SET payment_status = 'paid', status = 'confirmed' WHERE id = _r.order_id;
    END IF;
    UPDATE public.payment_requests SET status = 'approved', admin_note = _note, reviewed_at = now() WHERE id = _id;
  ELSE
    IF _r.purpose = 'order' AND _r.order_id IS NOT NULL THEN
      UPDATE public.orders SET payment_status = 'rejected' WHERE id = _r.order_id;
    END IF;
    UPDATE public.payment_requests SET status = 'rejected', admin_note = _note, reviewed_at = now() WHERE id = _id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.review_payment_request(uuid, boolean, text) TO authenticated;

-- ===== seed content =====
INSERT INTO public.site_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

INSERT INTO public.pages (slug, title, content) VALUES
 ('about','من نحن','<h2>من نحن</h2><p>تشكيلات متجر يمني متكامل يوفر لك كل ما تحتاجه في مكان واحد: أزياء، إلكترونيات، مستلزمات المنزل، ومنتجات يمنية أصيلة كالعسل الدوعني والبخور والحرف اليدوية.</p><p>نعمل على توصيل منتجات موثوقة بأسعار مناسبة إلى جميع المحافظات اليمنية.</p>'),
 ('contact','تواصل معنا','<h2>تواصل معنا</h2><p>يسعدنا خدمتك. يمكنك التواصل معنا عبر الواتساب أو الهاتف خلال أوقات العمل من السبت إلى الخميس، 9 صباحًا - 8 مساءً.</p>'),
 ('returns','سياسة الاستبدال والإرجاع','<h2>سياسة الاستبدال والإرجاع</h2><p>يمكنك طلب الاستبدال أو الإرجاع خلال 3 أيام من استلام الطلب بشرط أن يكون المنتج بحالته الأصلية ومع تغليفه.</p><ul><li>المنتجات الغذائية والعطور والبخور غير قابلة للإرجاع بعد فتحها.</li><li>تكلفة إرجاع المنتج بسبب تغيير الرأي تكون على العميل.</li><li>في حال وصول منتج تالف أو مخالف للوصف، نتحمل كامل تكاليف الاستبدال.</li></ul>')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.faqs (question, answer, sort_order) VALUES
 ('كم تستغرق مدة التوصيل؟','عادة من 1 إلى 3 أيام داخل صنعاء، ومن 2 إلى 5 أيام لبقية المحافظات.',1),
 ('ما هي طرق الدفع المتاحة؟','الدفع عند الاستلام، المحافظ الإلكترونية (جوالي، كاش، فلوسك، جيب)، الحوالات والإيداع البنكي، وكذلك الدفع من رصيدك داخل التطبيق.',2),
 ('هل يمكنني إرجاع المنتج؟','نعم، خلال 3 أيام من الاستلام وفق سياسة الاستبدال والإرجاع.',3),
 ('هل المنتجات اليمنية أصلية؟','نعم، نتعامل مع موردين موثوقين ونضمن أصالة العسل والبخور والحرف اليدوية.',4)
ON CONFLICT DO NOTHING;

INSERT INTO public.payment_methods (code, kind, display_name, account_number, account_name, instructions, requires_receipt, sort_order) VALUES
 ('cod','cod','الدفع عند الاستلام','','','ادفع نقدًا للمندوب عند تسليم الطلب.',false,1),
 ('wallet_balance','internal','الدفع من رصيد المحفظة','','','يتم خصم قيمة الطلب فورًا من رصيدك داخل التطبيق.',false,2),
 ('jawali','wallet','محفظة جوالي','777000000','تشكيلات للتسوق','حوّل المبلغ إلى رقم جوالي أعلاه ثم ارفع صورة إيصال التحويل.',true,3),
 ('cash','wallet','محفظة كاش','733000000','تشكيلات للتسوق','حوّل المبلغ إلى رقم كاش أعلاه ثم ارفع صورة إيصال التحويل.',true,4),
 ('floosak','wallet','محفظة فلوسك','711000000','تشكيلات للتسوق','حوّل المبلغ إلى رقم فلوسك أعلاه ثم ارفع صورة إيصال التحويل.',true,5),
 ('jaib','wallet','محفظة جيب','700000000','تشكيلات للتسوق','حوّل المبلغ إلى رقم جيب أعلاه ثم ارفع صورة إيصال التحويل.',true,6),
 ('bank','bank','حوالة مالية / إيداع بنكي','1234567890','تشكيلات للتسوق','أودع المبلغ في الحساب أعلاه أو أرسل حوالة باسم المستلم، ثم ارفع صورة الإيصال.',true,7)
ON CONFLICT (code) DO NOTHING;