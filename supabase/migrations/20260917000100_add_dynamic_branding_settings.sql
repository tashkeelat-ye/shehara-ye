-- =========================================================
-- SHEHARA
-- Dynamic Branding / PWA / SEO Settings
-- =========================================================

alter table public.site_settings
  add column if not exists pwa_icon_url text not null default '',
  add column if not exists pwa_icon_192_url text not null default '',
  add column if not exists pwa_icon_512_url text not null default '',
  add column if not exists splash_logo_url text not null default '',
  add column if not exists splash_background_url text not null default '',
  add column if not exists header_logo_url text not null default '',
  add column if not exists sidebar_logo_url text not null default '',
  add column if not exists auth_logo_url text not null default '',
  add column if not exists app_background_url text not null default '',
  add column if not exists seo_name text not null default '',
  add column if not exists seo_description text not null default '',
  add column if not exists seo_icon_url text not null default '';

-- ---------------------------------------------------------
-- Populate new fields from the existing official logo
-- so the current application continues working immediately.
-- ---------------------------------------------------------

update public.site_settings
set
  pwa_icon_url = case
    when coalesce(pwa_icon_url, '') = '' then coalesce(logo_url, '/icon-192.png')
    else pwa_icon_url
  end,

  pwa_icon_192_url = case
    when coalesce(pwa_icon_192_url, '') = '' then '/icon-192.png'
    else pwa_icon_192_url
  end,

  pwa_icon_512_url = case
    when coalesce(pwa_icon_512_url, '') = '' then '/icon-512.png'
    else pwa_icon_512_url
  end,

  splash_logo_url = case
    when coalesce(splash_logo_url, '') = '' then coalesce(logo_url, '/logo.png')
    else splash_logo_url
  end,

  splash_background_url = case
    when coalesce(splash_background_url, '') = '' then '/splash-background.png'
    else splash_background_url
  end,

  header_logo_url = case
    when coalesce(header_logo_url, '') = '' then coalesce(logo_url, '/logo.png')
    else header_logo_url
  end,

  sidebar_logo_url = case
    when coalesce(sidebar_logo_url, '') = '' then coalesce(logo_url, '/logo.png')
    else sidebar_logo_url
  end,

  auth_logo_url = case
    when coalesce(auth_logo_url, '') = '' then coalesce(logo_url, '/logo.png')
    else auth_logo_url
  end,

  seo_icon_url = case
    when coalesce(seo_icon_url, '') = '' then coalesce(pwa_icon_url, '/icon-192.png')
    else seo_icon_url
  end,

  seo_name = case
    when coalesce(seo_name, '') = '' then coalesce(store_name, 'شهارة للتسوق')
    else seo_name
  end,

  seo_description = case
    when coalesce(seo_description, '') = '' then
      coalesce(
        tagline,
        'شهارة | SHEHARA — متجر إلكتروني يمني للتسوق بسهولة وأمان.'
      )
    else seo_description
  end
where id = true;

-- ---------------------------------------------------------
-- Storage bucket for branding assets
-- ---------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'branding',
  'branding',
  true
)
on conflict (id) do update
set public = true;

-- ---------------------------------------------------------
-- Public read policy
-- ---------------------------------------------------------

drop policy if exists "branding_public_read"
on storage.objects;

create policy "branding_public_read"
on storage.objects
for select
to public
using (
  bucket_id = 'branding'
);

-- ---------------------------------------------------------
-- Admin upload/update/delete policies
-- ---------------------------------------------------------

drop policy if exists "branding_admin_insert"
on storage.objects;

create policy "branding_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'branding'
  and public.current_user_has_role('admin')
);

drop policy if exists "branding_admin_update"
on storage.objects;

create policy "branding_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'branding'
  and public.current_user_has_role('admin')
)
with check (
  bucket_id = 'branding'
  and public.current_user_has_role('admin')
);

drop policy if exists "branding_admin_delete"
on storage.objects;

create policy "branding_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'branding'
  and public.current_user_has_role('admin')
);
