-- ============================================================
-- SHEHARA - Invoice Settings
-- Production invoice configuration
-- ============================================================

create table if not exists public.invoice_settings (
  id boolean primary key default true check (id = true),

  enabled boolean not null default true,

  invoice_title text not null default 'فاتورة بيع',
  invoice_subtitle text not null default 'فاتورة إلكترونية',

  store_name text not null default 'شهارة للتسوق',
  store_tagline text not null default 'تسوق بلا حدود',
  store_address text not null default '',
  store_phone text not null default '',
  store_email text not null default '',
  commercial_registration text not null default '',
  tax_number text not null default '',

  logo_url text not null default '/logo.png',

  header_note text not null default '',
  footer_note text not null default 'شكراً لتسوقكم معنا',
  thank_you_message text not null default 'نسعد بخدمتكم دائماً',

  primary_color text not null default '#0D3B4D',
  secondary_color text not null default '#0A2A38',
  accent_color text not null default '#E2723A',

  show_invoice_number boolean not null default true,
  show_order_number boolean not null default true,
  show_invoice_date boolean not null default true,

  show_customer_details boolean not null default true,
  show_customer_phone boolean not null default true,
  show_customer_address boolean not null default true,

  show_store_details boolean not null default true,
  show_commercial_registration boolean not null default true,
  show_tax_number boolean not null default true,

  show_product_images boolean not null default true,
  show_product_description boolean not null default true,

  show_payment_method boolean not null default true,
  show_payment_status boolean not null default true,

  show_notes boolean not null default true,
  show_qr_code boolean not null default true,

  show_delivery_fee boolean not null default true,
  show_discount boolean not null default true,

  paper_size text not null default 'A4'
    check (paper_size in ('A4', 'thermal')),

  invoice_prefix text not null default 'INV',
  invoice_footer_enabled boolean not null default true,

  updated_at timestamptz not null default now()
);

insert into public.invoice_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.invoice_settings enable row level security;

drop policy if exists "invoice_settings_select_authenticated"
on public.invoice_settings;

create policy "invoice_settings_select_authenticated"
on public.invoice_settings
for select
to authenticated
using (true);

drop policy if exists "invoice_settings_admin_update"
on public.invoice_settings;

create policy "invoice_settings_admin_update"
on public.invoice_settings
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  )
);

drop policy if exists "invoice_settings_admin_insert"
on public.invoice_settings;

create policy "invoice_settings_admin_insert"
on public.invoice_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role::text = 'admin'
  )
);

create or replace function public.set_invoice_settings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoice_settings_updated_at
on public.invoice_settings;

create trigger invoice_settings_updated_at
before update on public.invoice_settings
for each row
execute function public.set_invoice_settings_updated_at();

comment on table public.invoice_settings is
'Central configuration for Shehara customer and admin invoices.';
