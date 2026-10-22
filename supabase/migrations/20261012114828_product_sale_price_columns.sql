alter table public.products add column sale_price_cents integer;
alter table public.products add constraint products_sale_price_check check(sale_price_cents is null or (sale_price_cents>0 and sale_price_cents<price_cents));
alter table public.products add column effective_price_cents integer generated always as (coalesce(sale_price_cents,price_cents)) stored;
