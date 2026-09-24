-- تحسين أداء لوحة الإدارة ومراقبة المخزون والطلبات.
-- متوافق مع Lovable Cloud/Supabase ويُنفذ من SQL Editor.

create index if not exists idx_products_admin_stock_active
  on public.products (is_active, stock_left, low_stock_threshold);

create index if not exists idx_orders_admin_status_created
  on public.orders (status, created_at desc);

create index if not exists idx_orders_admin_payment_status
  on public.orders (payment_status, created_at desc);

create index if not exists idx_payment_requests_admin_status_created
  on public.payment_requests (status, created_at desc);

create index if not exists idx_couriers_admin_active_enabled
  on public.couriers (is_active, account_enabled);

create index if not exists idx_vendors_admin_active
  on public.vendors (is_active, account_enabled);
