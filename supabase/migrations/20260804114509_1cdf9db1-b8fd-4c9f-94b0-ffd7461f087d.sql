-- profiles additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'YER',
  ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_order_policy BOOLEAN NOT NULL DEFAULT false;

-- addresses additions
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS landmark TEXT NOT NULL DEFAULT '';

-- orders additions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_landmark TEXT NOT NULL DEFAULT '';

-- site settings: SAR rate (how many YER per 1 SAR)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS sar_rate NUMERIC NOT NULL DEFAULT 140;

-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own notifications read" ON public.notifications;
CREATE POLICY "own notifications read" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "own notifications update" ON public.notifications;
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own notifications delete" ON public.notifications;
CREATE POLICY "own notifications delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin notifications insert" ON public.notifications;
CREATE POLICY "admin notifications insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

-- broadcast helper for admins
CREATE OR REPLACE FUNCTION public.broadcast_notification(_title TEXT, _body TEXT, _link TEXT DEFAULT '')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  INSERT INTO public.notifications (user_id, title, body, link_url, kind)
  SELECT id, _title, COALESCE(_body,''), COALESCE(_link,''), 'broadcast' FROM public.profiles;
  SELECT count(*) INTO _n FROM public.profiles;
  RETURN _n;
END; $$;

REVOKE ALL ON FUNCTION public.broadcast_notification(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_notification(TEXT, TEXT, TEXT) TO authenticated;

-- auto notification on order status / payment status change
CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _label TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, title, body, link_url, kind)
    VALUES (NEW.user_id, 'تم استلام طلبك', 'رقم الطلب ' || NEW.order_number, '/orders', 'order');
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    _label := CASE NEW.status
      WHEN 'pending' THEN 'بانتظار التأكيد'
      WHEN 'awaiting_payment' THEN 'بانتظار تأكيد الدفع'
      WHEN 'confirmed' THEN 'تم التأكيد'
      WHEN 'processing' THEN 'قيد التجهيز'
      WHEN 'shipped' THEN 'تم الشحن'
      WHEN 'delivered' THEN 'تم التسليم'
      WHEN 'cancelled' THEN 'ملغي'
      ELSE NEW.status::text END;
    INSERT INTO public.notifications (user_id, title, body, link_url, kind)
    VALUES (NEW.user_id, 'تحديث حالة الطلب', 'الطلب ' || NEW.order_number || ': ' || _label, '/orders', 'order');
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.notifications (user_id, title, body, link_url, kind)
    VALUES (NEW.user_id, 'تحديث حالة الدفع',
      'الطلب ' || NEW.order_number || ': ' || CASE NEW.payment_status
        WHEN 'paid' THEN 'تم تأكيد الدفع'
        WHEN 'pending' THEN 'بانتظار تأكيد الدفع'
        WHEN 'rejected' THEN 'تم رفض إثبات الدفع'
        ELSE NEW.payment_status END,
      '/orders', 'payment');
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS orders_notify ON public.orders;
CREATE TRIGGER orders_notify
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_change();