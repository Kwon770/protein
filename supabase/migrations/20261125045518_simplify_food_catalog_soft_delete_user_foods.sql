delete from public.food_catalog
where id in ('chicken', 'shake', 'yogurt', 'chicken-salad', 'tofu-bowl');

alter table public.food_catalog
  drop constraint food_catalog_serving_check,
  drop column is_listed,
  drop column estimate_preset,
  add constraint food_catalog_serving_check check (
    (kind = 'meal' and serving_amount is null and serving_unit is null)
    or (
      kind = 'food'
      and serving_amount is not null and serving_amount = 1
      and serving_unit is not null and serving_unit in ('개', '회분', '컵', '그릇', '팩', '병')
    )
  );

alter table public.user_foods
  add column is_deleted boolean not null default false;

revoke delete on table public.user_foods from authenticated;
drop policy user_foods_delete_own on public.user_foods;
