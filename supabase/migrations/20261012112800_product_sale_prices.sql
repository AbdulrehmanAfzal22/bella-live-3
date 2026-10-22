alter table public.products add column sale_price_cents integer;
alter table public.products add constraint products_sale_price_check check(sale_price_cents is null or (sale_price_cents>0 and sale_price_cents<price_cents));
alter table public.products add column effective_price_cents integer generated always as (coalesce(sale_price_cents,price_cents)) stored;

CREATE OR REPLACE FUNCTION public.save_product(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare pid uuid=(payload->>'id')::uuid; item jsonb; vid uuid; ids uuid[]='{}';
begin
 if not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if jsonb_array_length(payload->'variants')<1 then raise exception 'Add at least one variant';end if;
 if payload->>'status'='published' and jsonb_array_length(payload->'images')<1 then raise exception 'Upload at least one image before publishing';end if;
 insert into public.products(id,name,description,care,price_cents,sale_price_cents,category_id,status,featured,department)
 values(pid,trim(payload->>'name'),coalesce(payload->>'description',''),coalesce(payload->>'care',''),(payload->>'price_cents')::int,nullif(payload->>'sale_price_cents','')::int,nullif(payload->>'category_id','')::uuid,payload->>'status',coalesce((payload->>'featured')::boolean,false),coalesce(nullif(payload->>'department',''),'unisex'))
 on conflict(id) do update set name=excluded.name,description=excluded.description,care=excluded.care,price_cents=excluded.price_cents,sale_price_cents=excluded.sale_price_cents,category_id=excluded.category_id,status=excluded.status,featured=excluded.featured,department=excluded.department;
 for item in select * from jsonb_array_elements(payload->'variants') loop
  vid=coalesce(nullif(item->>'id','')::uuid,gen_random_uuid());
  if exists(select 1 from public.product_variants where id=vid and product_id<>pid) then raise exception 'Variant belongs to another product';end if;
  insert into public.product_variants(id,product_id,color,color_hex,size,stock,active)
  values(vid,pid,trim(item->>'color'),item->>'color_hex',trim(item->>'size'),(item->>'stock')::int,true)
  on conflict(id) do update set color=excluded.color,color_hex=excluded.color_hex,size=excluded.size,stock=excluded.stock,active=true;
  ids=array_append(ids,vid);
 end loop;
 update public.product_variants set active=false where product_id=pid and not(id=any(ids));
 delete from public.product_images where product_id=pid;
 for item in select * from jsonb_array_elements(payload->'images') loop
  if (item->>'path') not like pid::text||'/%' or not exists(select 1 from storage.objects where bucket_id='product-images' and name=item->>'path') then raise exception 'Product image not uploaded';end if;
  insert into public.product_images(product_id,path,color,alt,position) values(pid,item->>'path',nullif(item->>'color',''),coalesce(item->>'alt',payload->>'name'),coalesce((item->>'position')::int,0));
 end loop;
 return pid;
end$function$;

CREATE OR REPLACE FUNCTION private.checkout_impl(p_shipping jsonb, p_shipping_cents integer, p_request_id uuid)
 RETURNS TABLE(order_id uuid, order_number bigint, total_cents bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  uid uuid := auth.uid();
  new_order_id uuid;
  new_order_number bigint;
  subtotal bigint;
  address jsonb;
  item record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='28000'; END IF;
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'Checkout request ID is required' USING ERRCODE='22023'; END IF;
  IF coalesce(p_shipping_cents,0)<>0 THEN RAISE EXCEPTION 'Shipping is free; the delivery charge cannot be overridden' USING ERRCODE='22023'; END IF;
  INSERT INTO public.carts(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
  -- The same cart lock is taken by all three cart mutations.
  PERFORM 1 FROM public.carts c WHERE c.user_id=uid FOR UPDATE;
  RETURN QUERY SELECT o.id,o.order_number,o.total_cents FROM public.orders o WHERE o.user_id=uid AND o.request_id=p_request_id;
  IF FOUND THEN RETURN; END IF;

  IF p_shipping IS NULL OR jsonb_typeof(p_shipping)<>'object' THEN RAISE EXCEPTION 'Enter a shipping address'; END IF;
  IF length(btrim(coalesce(p_shipping->>'full_name',''))) NOT BETWEEN 1 AND 150
     OR length(btrim(coalesce(p_shipping->>'line1',''))) NOT BETWEEN 1 AND 300
     OR length(btrim(coalesce(p_shipping->>'city',''))) NOT BETWEEN 1 AND 150
     OR length(btrim(coalesce(p_shipping->>'country',''))) NOT BETWEEN 1 AND 100
     OR length(coalesce(p_shipping->>'postal_code',''))>20 OR length(coalesce(p_shipping->>'phone',''))>30 THEN
    RAISE EXCEPTION 'Enter a valid name, street address, city and country' USING ERRCODE='22023';
  END IF;
  address:=jsonb_build_object('full_name',btrim(p_shipping->>'full_name'),'line1',btrim(p_shipping->>'line1'),
    'city',btrim(p_shipping->>'city'),'country',btrim(p_shipping->>'country'),
    'postal_code',btrim(coalesce(p_shipping->>'postal_code','')),'phone',btrim(coalesce(p_shipping->>'phone','')));
  IF NOT EXISTS(SELECT 1 FROM public.cart_items ci WHERE ci.user_id=uid) THEN RAISE EXCEPTION 'Your bag is empty'; END IF;
  -- Freeze prices/publication state, then lock variant stock in a consistent order.
  PERFORM p.id FROM public.products p WHERE p.id IN (
    SELECT pv.product_id FROM public.product_variants pv JOIN public.cart_items ci ON ci.variant_id=pv.id WHERE ci.user_id=uid
  ) ORDER BY p.id FOR SHARE;
  PERFORM pv.id FROM public.product_variants pv JOIN public.cart_items ci ON ci.variant_id=pv.id
  WHERE ci.user_id=uid ORDER BY pv.id FOR UPDATE OF pv;
  FOR item IN SELECT ci.quantity,pv.stock,pv.active,p.status FROM public.cart_items ci
    JOIN public.product_variants pv ON pv.id=ci.variant_id JOIN public.products p ON p.id=pv.product_id WHERE ci.user_id=uid
  LOOP
    IF NOT item.active OR item.status<>'published' THEN RAISE EXCEPTION 'A piece in your bag is no longer available'; END IF;
    IF item.stock<item.quantity THEN RAISE EXCEPTION 'Insufficient stock for one or more items' USING ERRCODE='23514'; END IF;
  END LOOP;
  SELECT sum(p.effective_price_cents::bigint*ci.quantity) INTO subtotal FROM public.cart_items ci
  JOIN public.product_variants pv ON pv.id=ci.variant_id JOIN public.products p ON p.id=pv.product_id WHERE ci.user_id=uid;
  INSERT INTO public.orders AS o(user_id,request_id,status,payment_status,subtotal_cents,shipping_cents,total_cents,shipping_address)
  VALUES(uid,p_request_id,'pending','unpaid',subtotal,0,subtotal,address)
  RETURNING o.id,o.order_number INTO new_order_id,new_order_number;
  INSERT INTO public.order_items(order_id,variant_id,product_name,color,size,image_path,unit_price_cents,quantity)
  SELECT new_order_id,pv.id,p.name,pv.color,pv.size,
    (SELECT im.path FROM public.product_images im WHERE im.product_id=p.id ORDER BY (lower(im.color)=lower(pv.color)) DESC NULLS LAST,im.position LIMIT 1),
    p.effective_price_cents,ci.quantity FROM public.cart_items ci JOIN public.product_variants pv ON pv.id=ci.variant_id
    JOIN public.products p ON p.id=pv.product_id WHERE ci.user_id=uid;
  UPDATE public.product_variants pv SET stock=pv.stock-ci.quantity FROM public.cart_items ci WHERE ci.variant_id=pv.id AND ci.user_id=uid;
  INSERT INTO public.order_status_history(order_id,status) VALUES(new_order_id,'pending');
  DELETE FROM public.cart_items ci WHERE ci.user_id=uid;
  RETURN QUERY SELECT new_order_id,new_order_number,subtotal;
END $function$;

CREATE OR REPLACE FUNCTION private.queue_new_arrival()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status='published' and new.new_arrival and (tg_op='INSERT' or old.status is distinct from 'published' or not old.new_arrival) then
  insert into public.newsletter_deliveries(product_id,subscriber_id,product_name,description,price_cents)
  select new.id,s.id,new.name,new.description,new.effective_price_cents from public.newsletter_subscribers s where s.active on conflict(product_id,subscriber_id) do nothing;
 end if;
 return new;
end $function$;
