create table public.food_catalog (
  id text primary key check (btrim(id) <> '' and left(id, 7) <> 'custom:'),
  name text not null check (btrim(name) <> ''),
  protein_g integer not null check (protein_g > 0),
  kind text not null check (kind in ('food', 'meal')),
  category text not null,
  description text not null,
  serving_amount numeric,
  serving_unit text,
  estimate_preset boolean not null default false,
  search_terms text[] not null default '{}',
  icon_id text,
  sort_order integer not null check (sort_order >= 0),
  constraint food_catalog_serving_check check (
    (estimate_preset and kind = 'meal' and serving_amount is null and serving_unit is null)
    or (not estimate_preset and serving_amount is not null and serving_amount > 0
      and serving_unit is not null and serving_unit in ('g', '개', '회분', '컵', '그릇'))
  )
);

alter table public.food_catalog enable row level security;
revoke all on table public.food_catalog from public, anon, authenticated;
grant select on table public.food_catalog to anon, authenticated;

create policy food_catalog_read on public.food_catalog
  for select to anon, authenticated using (true);

create table public.user_foods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null check (left(id, 7) = 'custom:' and char_length(id) > 7),
  name text not null check (btrim(name) <> ''),
  protein_g integer not null check (protein_g between 1 and 300),
  icon_id text,
  primary key (user_id, id)
);

alter table public.user_foods enable row level security;
revoke all on table public.user_foods from public, anon, authenticated;
grant select, insert, update, delete on table public.user_foods to authenticated;

create policy user_foods_read_own on public.user_foods
  for select to authenticated using ((select auth.uid()) = user_id);

create policy user_foods_insert_own on public.user_foods
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy user_foods_update_own on public.user_foods
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy user_foods_delete_own on public.user_foods
  for delete to authenticated using ((select auth.uid()) = user_id);

insert into public.food_catalog (
  id, name, protein_g, kind, category, description,
  serving_amount, serving_unit, estimate_preset, search_terms, sort_order
) values
  (
    'meal-carb', '탄수화물 위주 식사', 10, 'meal', '일반식',
    '밥·면·빵이 대부분이고 고기, 달걀, 두부 같은 반찬이 적은 한 끼예요.',
    null, null, true, array['밥', '면', '라면', '빵', '떡', '국수'], 0
  ),
  (
    'meal-balanced', '균형 잡힌 식사', 20, 'meal', '일반식',
    '밥과 채소에 달걀·두부나 고기·생선 반찬을 곁들인 한 끼예요.',
    null, null, true, array['백반', '정식', '가정식', '집밥'], 1
  ),
  (
    'meal-meat-fish', '고기·생선 위주 식사', 30, 'meal', '일반식',
    '제육이나 생선구이처럼 고기 또는 생선 한 접시가 주메뉴인 한 끼예요.',
    null, null, true, array['고기 위주 식사', '생선 위주 식사', '제육', '불고기', '생선구이', '스테이크'], 2
  ),
  (
    'meal-protein', '단백질을 넉넉히 먹은 식사', 40, 'meal', '일반식',
    '닭가슴살에 달걀이나 두부를 넉넉히 곁들인 것처럼 단백질 음식이 많은 한 끼예요.',
    null, null, true, array['고단백', '단백질 위주 식사', '단백질 반찬', '운동식'], 3
  ),
  ('chicken', '닭가슴살', 23, 'food', '표준 식품', '조리된 닭가슴살 100g 기준', 100, 'g', false, '{}', 4),
  ('shake', '프로틴 쉐이크', 25, 'food', '제품 영양 정보', '1회 제공량 기준', 1, '회분', false, '{}', 5),
  ('yogurt', '그릭요거트', 12, 'food', '표준 식품', '무가당 제품 1컵 기준', 1, '컵', false, '{}', 6),
  ('eggs', '삶은 달걀', 13, 'food', '표준 식품', '중간 크기 달걀 2개 기준', 2, '개', false, '{}', 7),
  ('chicken-salad', '그릴드 치킨 샐러드', 32, 'meal', '식사 추정', '닭가슴살을 곁들인 샐러드 한 그릇 기준', 1, '그릇', false, '{}', 8),
  ('tofu-bowl', '두부 현미 덮밥', 21, 'meal', '식사 추정', '두부 150g과 현미밥 1공기를 가정한 추정치', 1, '그릇', false, '{}', 9);
