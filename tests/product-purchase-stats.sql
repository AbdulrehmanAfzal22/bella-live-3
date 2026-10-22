-- Rollback-only integration test; no fixture orders are retained.
begin;
do $$
declare
  buyer uuid;
  product uuid;
  variant uuid;
  first_order uuid := gen_random_uuid();
  second_order uuid := gen_random_uuid();
  baseline bigint;
  actual bigint;
begin
  select o.user_id into buyer from public.orders o limit 1;
  select p.id,v.id into product,variant from public.products p
  join public.product_variants v on v.product_id=p.id
  join public.product_purchase_stats s on s.product_id=p.id
  where p.status='published' and v.active and s.purchaser_count=0 limit 1;
  if buyer is null or product is null then raise exception 'Integration test needs an existing buyer and an unsold published product'; end if;
  select purchaser_count into baseline from public.product_purchase_stats where product_id=product;
  insert into public.orders(id,user_id,request_id,status,payment_status,subtotal_cents,shipping_cents,total_cents,currency,shipping_address,payment_method)
  values(first_order,buyer,gen_random_uuid(),'confirmed','paid',100,0,100,'PKR','{}','bank_transfer'),
        (second_order,buyer,gen_random_uuid(),'confirmed','paid',100,0,100,'PKR','{}','bank_transfer');
  insert into public.order_items(order_id,variant_id,product_name,color,size,unit_price_cents,quantity)
  values(first_order,variant,'ROLLBACK TEST','Rose','Standard',100,1),
        (second_order,variant,'ROLLBACK TEST','Rose','Standard',100,1);
  select purchaser_count into actual from public.product_purchase_stats where product_id=product;
  if actual<>baseline+1 then raise exception 'Distinct buyer count failed: %',actual; end if;
  update public.orders set status='cancelled' where id=first_order;
  select purchaser_count into actual from public.product_purchase_stats where product_id=product;
  if actual<>baseline+1 then raise exception 'Remaining valid order was not counted'; end if;
  update public.orders set payment_status='refunded' where id=second_order;
  select purchaser_count into actual from public.product_purchase_stats where product_id=product;
  if actual<>baseline then raise exception 'Refunded purchase was counted'; end if;
  update public.orders set payment_status='unpaid',status='pending' where id=second_order;
  select purchaser_count into actual from public.product_purchase_stats where product_id=product;
  if actual<>baseline then raise exception 'Unpaid pending order was counted'; end if;
  update public.orders set status='delivered' where id=second_order;
  select purchaser_count into actual from public.product_purchase_stats where product_id=product;
  if actual<>baseline+1 then raise exception 'Delivered order was not counted'; end if;
  delete from public.order_items where order_id in (first_order,second_order);
  select purchaser_count into actual from public.product_purchase_stats where product_id=product;
  if actual<>baseline then raise exception 'Deleted items left a stale count'; end if;
end;
$$;
select 'PASS: distinct purchasers, cancellations, refunds, pending payments, delivered orders, deleted items' as checks;
rollback;
