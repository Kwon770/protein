create schema tracking_internal;
revoke all on schema tracking_internal from public, anon, authenticated;
grant usage on schema tracking_internal to authenticated;

create table tracking_internal.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  favorite_food_ids text[] not null default '{}',
  quick_food_ids text[] not null default '{eggs,product-4bba4b3a2b9c6bde,meal-meat-fish}',
  favorites_configured boolean not null default false,
  quick_configured boolean not null default false,
  revision bigint not null default 0,
  check (array_position(favorite_food_ids, null) is null),
  check (cardinality(quick_food_ids) <= 5 and array_position(quick_food_ids, null) is null)
);

create table tracking_internal.records (
  user_id uuid not null references auth.users (id) on delete cascade,
  record_key bytea not null check (octet_length(record_key) = 32),
  record jsonb,
  primary key (user_id, record_key),
  -- A null payload retains only a digest, so older devices cannot re-import a deleted record.
  check (record is null or (
    jsonb_typeof(record) = 'object'
    and jsonb_typeof(record->'id') = 'string' and record->>'id' <> ''
    and record_key = sha256(convert_to(record->>'id', 'UTF8'))
    and jsonb_typeof(record->'label') = 'string'
    and jsonb_typeof(record->'proteinG') = 'number'
    and (record->'proteinG') > '0'::jsonb
    and jsonb_typeof(record->'localDate') = 'string'
    and jsonb_typeof(record->'takenAt') = 'string'
  ) is true)
);

create table tracking_internal.operation_receipts (
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null,
  primary key (user_id, operation_id)
);

alter table tracking_internal.preferences enable row level security;
alter table tracking_internal.records enable row level security;
alter table tracking_internal.operation_receipts enable row level security;

revoke all on all tables in schema tracking_internal from public, anon, authenticated;
grant select, insert, update on tracking_internal.preferences, tracking_internal.records to authenticated;
grant select, insert on tracking_internal.operation_receipts to authenticated;

create policy preferences_owner on tracking_internal.preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy records_owner on tracking_internal.records for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy operation_receipts_owner on tracking_internal.operation_receipts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.sync_account_tracking(p_owner uuid, p_seed jsonb, p_operations jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  favorites text[];
  quick_foods text[];
  has_favorites boolean;
  has_quick_foods boolean;
  current_revision bigint;
  records jsonb;
  seed_record jsonb;
  op jsonb;
  op_record jsonb;
  record_id text;
  hashed_record_id bytea;
  food_id text;
  changed boolean;
  has_seed boolean := p_seed is not null and p_seed <> 'null'::jsonb;
begin
  if p_owner is null or p_owner is distinct from (select auth.uid()) then
    raise exception 'Tracking account mismatch' using errcode = '42501';
  end if;

  if jsonb_typeof(p_operations) is distinct from 'array' then
    raise exception 'Invalid tracking operations' using errcode = '22023';
  end if;

  if has_seed and (
    jsonb_typeof(p_seed->'records') is distinct from 'array'
    or jsonb_typeof(p_seed->'favoriteFoodIds') is distinct from 'array'
    or jsonb_typeof(p_seed->'quickFoodIds') is distinct from 'array'
  ) then
    raise exception 'Invalid tracking seed' using errcode = '22023';

  end if;

  insert into tracking_internal.preferences (user_id)
  values (p_owner)
  on conflict (user_id) do nothing;
  changed := found;

  -- Hold a per-account lock until both the mutations and their snapshot are complete.
  select prefs.favorite_food_ids, prefs.quick_food_ids,
    prefs.favorites_configured, prefs.quick_configured, prefs.revision
    into favorites, quick_foods, has_favorites, has_quick_foods, current_revision
  from tracking_internal.preferences as prefs
  where prefs.user_id = p_owner
  for update;

  if has_seed then
    -- A device with saved preferences can import each list until a device has set it.
    if not has_favorites and p_seed->'importFavorites' = 'true'::jsonb then
      favorites := array(select jsonb_array_elements_text(p_seed->'favoriteFoodIds'));
      has_favorites := true;
      changed := true;
    end if;
    if not has_quick_foods and p_seed->'importQuick' = 'true'::jsonb then
      quick_foods := array(select jsonb_array_elements_text(p_seed->'quickFoodIds'));
      has_quick_foods := true;
      changed := true;
    end if;

    for seed_record in select value from jsonb_array_elements(p_seed->'records') loop
      insert into tracking_internal.records (user_id, record_key, record)
      values (p_owner, sha256(convert_to(seed_record->>'id', 'UTF8')), seed_record - 'ownerId')
      on conflict do nothing;
      changed := changed or found;
    end loop;
  end if;

  for op in select value from jsonb_array_elements(p_operations) with ordinality order by ordinality loop
    insert into tracking_internal.operation_receipts (user_id, operation_id)
    values (p_owner, (op->>'id')::uuid)
    on conflict do nothing;
    if not found then
      continue;
    end if;
    changed := true;

    case op->>'type'
      when 'record' then
        record_id := op->>'recordId';
        op_record := op->'record';
        if record_id is null or record_id = '' then
          raise exception 'Missing tracking record ID' using errcode = '22023';
        end if;
        hashed_record_id := sha256(convert_to(record_id, 'UTF8'));
        if op_record is null or op_record = 'null'::jsonb then
          insert into tracking_internal.records (user_id, record_key, record)
          values (p_owner, hashed_record_id, null)
          on conflict on constraint records_pkey do update set record = null;
        elsif jsonb_typeof(op_record) is distinct from 'object' or op_record->>'id' is distinct from record_id then
          raise exception 'Tracking record ID mismatch' using errcode = '22023';
        elsif op->'create' = 'true'::jsonb then
          insert into tracking_internal.records (user_id, record_key, record)
          values (p_owner, hashed_record_id, op_record - 'ownerId')
          on conflict on constraint records_pkey do update set record = excluded.record;
        else
          update tracking_internal.records as saved
          set record = op_record - 'ownerId'
          where saved.user_id = p_owner
            and saved.record_key = hashed_record_id
            and saved.record is not null;
        end if;
      when 'favorite' then
        food_id := op->>'foodId';
        if jsonb_typeof(op->'saved') is distinct from 'boolean' or food_id is null or food_id = '' then
          raise exception 'Invalid favorite operation' using errcode = '22023';
        end if;
        if op->'saved' = 'true'::jsonb then
          if not (food_id = any(favorites)) then
            favorites := array_prepend(food_id, favorites);
          end if;
        else
          favorites := array_remove(favorites, food_id);
        end if;
        has_favorites := true;
      when 'quick' then
        if jsonb_typeof(op->'foodIds') is distinct from 'array' then
          raise exception 'Invalid quick foods operation' using errcode = '22023';
        end if;
        quick_foods := array(select jsonb_array_elements_text(op->'foodIds'));
        has_quick_foods := true;
      else
        raise exception 'Unknown tracking operation' using errcode = '22023';
    end case;
  end loop;

  if changed then
    current_revision := current_revision + 1;
    update tracking_internal.preferences as prefs
    set favorite_food_ids = favorites, quick_food_ids = quick_foods,
      favorites_configured = has_favorites, quick_configured = has_quick_foods,
      revision = current_revision
    where prefs.user_id = p_owner;
  end if;

  select coalesce(jsonb_agg(saved.record || jsonb_build_object('ownerId', p_owner)
    order by saved.record->>'takenAt', saved.record->>'id'), '[]'::jsonb)
  into records
  from tracking_internal.records as saved
  where saved.user_id = p_owner and saved.record is not null;

  return jsonb_build_object('records', records, 'favoriteFoodIds', favorites,
    'quickFoodIds', quick_foods, 'revision', current_revision);
end;
$$;

revoke all on function public.sync_account_tracking(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_account_tracking(uuid, jsonb, jsonb) to authenticated;
