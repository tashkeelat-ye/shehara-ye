CREATE OR REPLACE FUNCTION public.notify_parties_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cu uuid;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.notifications (user_id, title, body, link_url, kind)
      SELECT ur.user_id, 'طلب جديد في المتجر', 'رقم الطلب ' || NEW.order_number || ' بقيمة ' || NEW.total, '/admin/orders', 'order'
      FROM public.user_roles ur WHERE ur.role = 'admin';
      RETURN NEW;
    END IF;
    IF NEW.courier_id IS DISTINCT FROM OLD.courier_id AND NEW.courier_id IS NOT NULL THEN
      SELECT user_id INTO _cu FROM public.couriers WHERE id = NEW.courier_id;
      IF _cu IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, body, link_url, kind)
        VALUES (_cu, 'تم إسناد شحنة جديدة لك', 'الطلب ' || NEW.order_number || ' — ' || NEW.shipping_city || ' ' || NEW.shipping_district, '/courier', 'order');
      END IF;
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.notifications (user_id, title, body, link_url, kind)
      SELECT DISTINCT v.user_id, 'تحديث حالة طلب', 'الطلب ' || NEW.order_number || ' أصبح: ' || NEW.status, '/merchant/dashboard', 'order'
      FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id JOIN public.vendors v ON v.id = p.vendor_id
      WHERE oi.order_id = NEW.id AND v.user_id IS NOT NULL;
      IF NEW.status IN ('delivered','cancelled') THEN
        INSERT INTO public.notifications (user_id, title, body, link_url, kind)
        SELECT ur.user_id, 'تحديث حالة طلب', 'الطلب ' || NEW.order_number || ' أصبح: ' || NEW.status, '/admin/orders', 'order'
        FROM public.user_roles ur WHERE ur.role = 'admin';
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_parties_order failed: %', SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_parties_order ON public.orders;
CREATE TRIGGER trg_notify_parties_order AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_parties_order();

CREATE OR REPLACE FUNCTION public.notify_vendor_order_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vu uuid; _num text;
BEGIN
  BEGIN
    SELECT v.user_id INTO _vu FROM public.products p JOIN public.vendors v ON v.id = p.vendor_id WHERE p.id = NEW.product_id;
    IF _vu IS NOT NULL THEN
      SELECT order_number INTO _num FROM public.orders WHERE id = NEW.order_id;
      IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = _vu AND kind = 'order' AND body LIKE '%' || _num || '%' AND title = 'طلب جديد لمتجرك') THEN
        INSERT INTO public.notifications (user_id, title, body, link_url, kind)
        VALUES (_vu, 'طلب جديد لمتجرك', 'وصل طلب جديد رقم ' || _num || ' يحتوي منتجاتك', '/merchant/dashboard', 'order');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_vendor_order_item failed: %', SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_vendor_order_item ON public.order_items;
CREATE TRIGGER trg_notify_vendor_order_item AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.notify_vendor_order_item();

CREATE OR REPLACE FUNCTION public.notify_admins_misc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text; _b text; _l text;
BEGIN
  BEGIN
    IF TG_TABLE_NAME = 'payment_requests' THEN
      _t := 'طلب دفع بانتظار المراجعة'; _b := 'مبلغ ' || NEW.amount || ' عبر ' || NEW.method_code; _l := '/admin/payment-requests';
    ELSIF TG_TABLE_NAME = 'vendors' THEN
      _t := 'طلب انضمام تاجر جديد'; _b := 'متجر: ' || NEW.name || ' — ' || NEW.city; _l := '/admin/vendors';
    ELSIF TG_TABLE_NAME = 'support_threads' THEN
      _t := 'محادثة دعم جديدة'; _b := NEW.subject; _l := '/admin/support';
    ELSE RETURN NEW; END IF;
    INSERT INTO public.notifications (user_id, title, body, link_url, kind)
    SELECT ur.user_id, _t, _b, _l, 'system' FROM public.user_roles ur WHERE ur.role = 'admin';
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'notify_admins_misc failed: %', SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_payment ON public.payment_requests;
CREATE TRIGGER trg_notify_admins_payment AFTER INSERT ON public.payment_requests FOR EACH ROW EXECUTE FUNCTION public.notify_admins_misc();
DROP TRIGGER IF EXISTS trg_notify_admins_vendor ON public.vendors;
CREATE TRIGGER trg_notify_admins_vendor AFTER INSERT ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.notify_admins_misc();
DROP TRIGGER IF EXISTS trg_notify_admins_support ON public.support_threads;
CREATE TRIGGER trg_notify_admins_support AFTER INSERT ON public.support_threads FOR EACH ROW EXECUTE FUNCTION public.notify_admins_misc();

REVOKE EXECUTE ON FUNCTION public.notify_parties_order(), public.notify_vendor_order_item(), public.notify_admins_misc() FROM PUBLIC, anon, authenticated;