create function food_cache_internal.normalize_catalog_search_terms()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.search_terms := array(
    select term
    from (
      select
        -- Match the search UI's ECMAScript whitespace and punctuation rules.
        translate(
          lower(normalize(raw_term, NFKC) collate pg_catalog."ko-KR-x-icu"),
          U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF·:',
          ''
        ) collate pg_catalog."C" as term,
        term_index
      from unnest(new.search_terms) with ordinality as input(raw_term, term_index)
    ) as normalized
    where term <> ''
    group by term
    order by min(term_index)
  );
  return new;
end;
$$;

revoke all on function food_cache_internal.normalize_catalog_search_terms() from public, anon, authenticated;

create trigger food_catalog_normalize_search_terms
  before insert or update of search_terms on public.food_catalog
  for each row when (new.search_terms is not null)
  execute function food_cache_internal.normalize_catalog_search_terms();

update public.food_catalog set search_terms = search_terms;
