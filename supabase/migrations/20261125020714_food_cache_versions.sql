create table public.food_cache_versions (
  id uuid primary key default gen_random_uuid(),
  scope text unique not null,
  owner_id uuid references auth.users (id) on delete cascade,
  version bigint not null default 1 check (version >= 1),
  constraint food_cache_version_scope check (
    (owner_id is null and scope = 'catalog')
    or (owner_id is not null and scope = 'user:' || owner_id::text)
  )
);

create index food_cache_versions_owner_id_idx on public.food_cache_versions (owner_id);

alter table public.food_cache_versions enable row level security;
revoke all on table public.food_cache_versions from public, anon, authenticated;
grant select on table public.food_cache_versions to anon, authenticated;

create policy food_cache_versions_public_read on public.food_cache_versions
  for select to anon, authenticated using (scope = 'catalog');

create policy food_cache_versions_owner_read on public.food_cache_versions
  for select to authenticated using (owner_id = (select auth.uid()));

create schema food_cache_internal;
revoke all on schema food_cache_internal from public, anon, authenticated;

-- These trigger-only functions update a read-only table as part of each food write.
create function food_cache_internal.bump_catalog_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  changed boolean;
begin
  case tg_op
    when 'INSERT' then select exists (select from new_foods) into changed;
    when 'DELETE' then select exists (select from old_foods) into changed;
    when 'UPDATE' then
      select exists (select * from old_foods except select * from new_foods) into changed;
    else changed := true;
  end case;

  if changed then
    update public.food_cache_versions set version = version + 1 where scope = 'catalog';
  end if;
  return null;
end;
$$;

create function food_cache_internal.bump_user_food_versions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  changed_owners uuid[];
begin
  case tg_op
    when 'INSERT' then select array_agg(distinct user_id) into changed_owners from new_foods;
    when 'DELETE' then select array_agg(distinct user_id) into changed_owners from old_foods;
    when 'UPDATE' then
      select array_agg(distinct changed.user_id) into changed_owners
      from (
        (select * from old_foods except select * from new_foods)
        union all
        (select * from new_foods except select * from old_foods)
      ) as changed;
    else
      update public.food_cache_versions set version = version + 1 where owner_id is not null;
      return null;
  end case;

  -- During account deletion the owner is already gone, so the version stays deleted.
  insert into public.food_cache_versions (scope, owner_id)
  select 'user:' || users.id::text, users.id
  from auth.users
  where users.id = any(changed_owners)
  order by users.id
  on conflict (scope) do update set version = food_cache_versions.version + 1;

  return null;
end;
$$;

revoke all on function food_cache_internal.bump_catalog_version() from public, anon, authenticated;
revoke all on function food_cache_internal.bump_user_food_versions() from public, anon, authenticated;

create trigger food_catalog_version_after_insert
  after insert on public.food_catalog referencing new table as new_foods
  for each statement execute function food_cache_internal.bump_catalog_version();
create trigger food_catalog_version_after_update
  after update on public.food_catalog referencing old table as old_foods new table as new_foods
  for each statement execute function food_cache_internal.bump_catalog_version();
create trigger food_catalog_version_after_delete
  after delete on public.food_catalog referencing old table as old_foods
  for each statement execute function food_cache_internal.bump_catalog_version();
create trigger food_catalog_version_after_truncate
  after truncate on public.food_catalog
  for each statement execute function food_cache_internal.bump_catalog_version();

create trigger user_food_version_after_insert
  after insert on public.user_foods referencing new table as new_foods
  for each statement execute function food_cache_internal.bump_user_food_versions();
create trigger user_food_version_after_update
  after update on public.user_foods referencing old table as old_foods new table as new_foods
  for each statement execute function food_cache_internal.bump_user_food_versions();
create trigger user_food_version_after_delete
  after delete on public.user_foods referencing old table as old_foods
  for each statement execute function food_cache_internal.bump_user_food_versions();
create trigger user_food_version_after_truncate
  after truncate on public.user_foods
  for each statement execute function food_cache_internal.bump_user_food_versions();

insert into public.food_cache_versions (scope) values ('catalog');

insert into public.food_cache_versions (scope, owner_id)
select distinct 'user:' || user_id::text, user_id from public.user_foods;

-- Default replica identity limits Realtime's DELETE payload to the opaque primary key.
alter table public.food_cache_versions replica identity default;
alter publication supabase_realtime add table public.food_cache_versions;
