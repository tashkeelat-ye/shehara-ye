-- ============================================================
-- SHEHARA — AUTH & ROLE HARDENING
-- Migration: 20260902000400_shehara_auth_roles.sql
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Ensure application roles exist
-- ------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'customer'
  ) then
    alter type public.app_role add value 'customer';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'vendor'
  ) then
    alter type public.app_role add value 'vendor';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'courier'
  ) then
    alter type public.app_role add value 'courier';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'admin'
  ) then
    alter type public.app_role add value 'admin';
  end if;
end
$$;


-- ------------------------------------------------------------
-- 2. Harden has_role()
-- ------------------------------------------------------------

create or replace function public.has_role(
  _user_id uuid,
  _role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
  );
$$;

revoke all on function public.has_role(uuid, public.app_role)
from public;

grant execute on function public.has_role(uuid, public.app_role)
to authenticated;


-- ------------------------------------------------------------
-- 3. Current-user role helper
-- ------------------------------------------------------------

create or replace function public.current_user_has_role(
  _role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.has_role(auth.uid(), _role);
$$;

revoke all on function public.current_user_has_role(public.app_role)
from public;

grant execute on function public.current_user_has_role(public.app_role)
to authenticated;


-- ------------------------------------------------------------
-- 4. Admin helper
-- ------------------------------------------------------------

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

revoke all on function public.is_current_user_admin()
from public;

grant execute on function public.is_current_user_admin()
to authenticated;


-- ------------------------------------------------------------
-- 5. Vendor helper
-- ------------------------------------------------------------

create or replace function public.is_current_user_vendor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.has_role(auth.uid(), 'vendor'::public.app_role);
$$;

revoke all on function public.is_current_user_vendor()
from public;

grant execute on function public.is_current_user_vendor()
to authenticated;


-- ------------------------------------------------------------
-- 6. Courier helper
-- ------------------------------------------------------------

create or replace function public.is_current_user_courier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.has_role(auth.uid(), 'courier'::public.app_role);
$$;

revoke all on function public.is_current_user_courier()
from public;

grant execute on function public.is_current_user_courier()
to authenticated;


-- ------------------------------------------------------------
-- 7. Customer helper
-- ------------------------------------------------------------

create or replace function public.is_current_user_customer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and public.has_role(auth.uid(), 'customer'::public.app_role);
$$;

revoke all on function public.is_current_user_customer()
from public;

grant execute on function public.is_current_user_customer()
to authenticated;


-- ------------------------------------------------------------
-- 8. Ensure user_roles has RLS
-- ------------------------------------------------------------

alter table if exists public.user_roles enable row level security;


-- ------------------------------------------------------------
-- 9. Users can read their own roles
-- ------------------------------------------------------------

drop policy if exists "Users can view own roles"
on public.user_roles;

create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
);


-- ------------------------------------------------------------
-- 10. Admins can read all roles
-- ------------------------------------------------------------

drop policy if exists "Admins can view all roles"
on public.user_roles;

create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (
  public.is_current_user_admin()
);


-- ------------------------------------------------------------
-- 11. Admins can manage roles
-- ------------------------------------------------------------

drop policy if exists "Admins can insert roles"
on public.user_roles;

create policy "Admins can insert roles"
on public.user_roles
for insert
to authenticated
with check (
  public.is_current_user_admin()
);


drop policy if exists "Admins can update roles"
on public.user_roles;

create policy "Admins can update roles"
on public.user_roles
for update
to authenticated
using (
  public.is_current_user_admin()
)
with check (
  public.is_current_user_admin()
);


drop policy if exists "Admins can delete roles"
on public.user_roles;

create policy "Admins can delete roles"
on public.user_roles
for delete
to authenticated
using (
  public.is_current_user_admin()
);


-- ------------------------------------------------------------
-- 12. Prevent duplicate user roles
-- ------------------------------------------------------------

create unique index if not exists
user_roles_user_id_role_unique
on public.user_roles(user_id, role);


-- ------------------------------------------------------------
-- 13. Courier activation helper
-- ------------------------------------------------------------

create or replace function public.ensure_courier_role(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_current_user_admin() then
    raise exception 'Admin permission required';
  end if;

  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    p_user_id,
    'courier'::public.app_role
  )
  on conflict (user_id, role)
  do nothing;

  return true;
end;
$$;

revoke all on function public.ensure_courier_role(uuid)
from public;

grant execute on function public.ensure_courier_role(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 14. Vendor role helper
-- ------------------------------------------------------------

create or replace function public.ensure_vendor_role(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_current_user_admin() then
    raise exception 'Admin permission required';
  end if;

  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    p_user_id,
    'vendor'::public.app_role
  )
  on conflict (user_id, role)
  do nothing;

  return true;
end;
$$;

revoke all on function public.ensure_vendor_role(uuid)
from public;

grant execute on function public.ensure_vendor_role(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 15. Customer role helper
-- ------------------------------------------------------------

create or replace function public.ensure_customer_role(
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_current_user_admin()
     and auth.uid() <> p_user_id then
    raise exception 'Permission denied';
  end if;

  if p_user_id is null then
    raise exception 'User ID is required';
  end if;

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    p_user_id,
    'customer'::public.app_role
  )
  on conflict (user_id, role)
  do nothing;

  return true;
end;
$$;

revoke all on function public.ensure_customer_role(uuid)
from public;

grant execute on function public.ensure_customer_role(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 16. Remove dangerous public execution
-- ------------------------------------------------------------

revoke execute
on function public.ensure_vendor_role(uuid)
from anon;

revoke execute
on function public.ensure_courier_role(uuid)
from anon;

revoke execute
on function public.ensure_customer_role(uuid)
from anon;


-- ------------------------------------------------------------
-- 17. Final grants
-- ------------------------------------------------------------

grant usage on schema public to authenticated;

commit;
