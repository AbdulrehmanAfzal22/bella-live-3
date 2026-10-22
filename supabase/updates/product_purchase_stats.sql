-- Public aggregate counts only: no customer names, IDs or order details.
create table public.product_purchase_stats (
  product_id uuid primary key references public.products(id) on delete cascade,
  purchaser_count bigint not null default 0 check (purchaser_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.product_purchase_stats enable row level security;
revoke all on public.product_purchase_stats from public, anon, authenticated;
grant select on public.product_purchase_stats to anon, authenticated;
create policy published_product_purchase_stats_read
on public.product_purchase_stats for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));

-- Trigger-only function in a non-exposed schema. Checkout RLS remains unchanged.
create function private.sync_product_purchase_stats()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if pg_catalog.pg_trigger_depth() < 1 then
    raise exception 'This function is only available to database triggers';
  end if;
  -- Serialize summary refreshes so concurrent checkouts cannot overwrite newer counts.
  perform pg_catalog.pg_advisory_xact_lock(54117, 281);
  insert into public.product_purchase_stats(product_id, purchaser_count)
  select p.id, count(distinct o.user_id) filter (
    where o.status <> 'cancelled' and o.payment_status <> 'refunded'
      and (o.payment_status = 'paid' or o.status = 'delivered')
  )
  from public.products p
  left join public.product_variants v on v.product_id = p.id
  left join public.order_items oi on oi.variant_id = v.id
  left join public.orders o on o.id = oi.order_id
  group by p.id
  on conflict (product_id) do update
    set purchaser_count = excluded.purchaser_count, updated_at = now()
    where public.product_purchase_stats.purchaser_count is distinct from excluded.purchaser_count;
  return null;
end;
$$;
revoke all on function private.sync_product_purchase_stats() from public, anon, authenticated;
create trigger product_purchase_stats_after_orders
  after insert or update or delete on public.orders
  for each statement execute function private.sync_product_purchase_stats();
create trigger product_purchase_stats_after_items
  after insert or update or delete on public.order_items
  for each statement execute function private.sync_product_purchase_stats();
create trigger product_purchase_stats_after_variant_reassignment
  after update of product_id on public.product_variants
  for each statement execute function private.sync_product_purchase_stats();

insert into public.product_purchase_stats(product_id, purchaser_count)
select p.id, count(distinct o.user_id) filter (
  where o.status <> 'cancelled' and o.payment_status <> 'refunded'
    and (o.payment_status = 'paid' or o.status = 'delivered')
)
from public.products p
left join public.product_variants v on v.product_id = p.id
left join public.order_items oi on oi.variant_id = v.id
left join public.orders o on o.id = oi.order_id
 group by p.id;
