-- Verify discounted checkout and price reset; all fixture changes are rolled back.
do $suite$
declare r jsonb:='[]';pid uuid:=gen_random_uuid();vid uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();uid uuid:=gen_random_uuid();adm uuid;got record;payload jsonb;live_product uuid;
begin
 begin
  create temp table sale_qa_scope(x integer);
  execute $helper$create function pg_temp.sale_check(label text,statement text,expected_state text default null) returns jsonb language plpgsql as $body$
  declare actual boolean;
  begin execute statement into actual;return jsonb_build_object('test',label,'pass',expected_state is null and coalesce(actual,false));
  exception when others then return jsonb_build_object('test',label,'pass',sqlstate=expected_state,'error',sqlerrm,'sqlstate',sqlstate);end $body$;$helper$;
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values(uid,'authenticated','authenticated','sale-price-qa@example.invalid',now(),'{"provider":"email"}','{}',now(),now());
  insert into public.categories(id,name,slug) values(cid,'SALE QA','sale-qa-'||cid);
  insert into public.products(id,name,description,price_cents,sale_price_cents,category_id,status,new_arrival) values(pid,'SALE QA','Sale pricing fixture',160000,130000,cid,'draft',false);
  insert into public.product_images(product_id,path,position) values(pid,pid||'/qa.png',0);
  insert into public.product_variants(id,product_id,color,size,stock) values(vid,pid,'QA','One piece',5);
  update public.products set status='published' where id=pid;
  r:=r||pg_temp.sale_check('Original 1600 and sale 1300 stored separately',format('select price_cents=160000 and sale_price_cents=130000 and effective_price_cents=130000 from public.products where id=%L',pid));
  r:=r||pg_temp.sale_check('Sale equal to original is rejected',format('update public.products set sale_price_cents=160000 where id=%L returning true',pid),'23514');
  r:=r||pg_temp.sale_check('Sale above original is rejected',format('update public.products set sale_price_cents=170000 where id=%L returning true',pid),'23514');
  r:=r||pg_temp.sale_check('Zero sale is rejected',format('update public.products set sale_price_cents=0 where id=%L returning true',pid),'23514');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  r:=r||pg_temp.sale_check('Customer cannot edit product sale price',format('with changed as(update public.products set sale_price_cents=1 where id=%L returning 1)select count(*)=0 from changed',pid));
  perform public.add_to_cart(vid,2);
  select * into got from public.checkout_order('{"full_name":"QA","line1":"QA Street","city":"Lahore","country":"Pakistan"}',gen_random_uuid());
  r:=r||pg_temp.sale_check('Server charges two units at the sale price',format('select total_cents=260000 and subtotal_cents=260000 and currency=''PKR'' from public.orders where id=%L',got.order_id));
  r:=r||pg_temp.sale_check('Order item captures sale price',format('select unit_price_cents=130000 and quantity=2 from public.order_items where order_id=%L',got.order_id));
  execute 'reset role';update public.products set sale_price_cents=null where id=pid;
  r:=r||pg_temp.sale_check('Removing sale restores original effective price',format('select effective_price_cents=160000 and sale_price_cents is null from public.products where id=%L',pid));
  r:=r||pg_temp.sale_check('Existing order retains purchased sale price',format('select unit_price_cents=130000 from public.order_items where order_id=%L',got.order_id));
  execute 'set local role authenticated';perform public.add_to_cart(vid,1);
  select * into got from public.checkout_order('{"full_name":"QA","line1":"QA Street","city":"Lahore","country":"Pakistan"}',gen_random_uuid());
  r:=r||pg_temp.sale_check('Checkout without sale charges original price',format('select total_cents=160000 from public.orders where id=%L',got.order_id));
  execute 'reset role';
  -- Exercise the actual admin save RPC against one uploaded product inside rollback.
  select user_id into adm from private.admin_members limit 1;
  select id into live_product from public.products where id<>pid and status='published' limit 1;
  select jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'care',p.care,'price_cents',p.price_cents,'sale_price_cents',120000,'category_id',p.category_id,'status',p.status,'featured',p.featured,'department',p.department,'new_arrival',p.new_arrival,
   'images',(select jsonb_agg(jsonb_build_object('path',i.path,'position',i.position,'alt',i.alt,'color',i.color)) from public.product_images i where i.product_id=p.id),
   'variants',(select jsonb_agg(jsonb_build_object('id',v.id,'color',v.color,'color_hex',v.color_hex,'size',v.size,'stock',v.stock)) from public.product_variants v where v.product_id=p.id and v.active)) into payload from public.products p where p.id=live_product;
  if adm is null or payload is null then raise exception 'Admin/product fixture unavailable';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',adm,'role','authenticated')::text,true);execute 'set local role authenticated';
  perform public.save_product_with_arrival(payload);
  r:=r||pg_temp.sale_check('Admin product editor RPC persists sale price',format('select sale_price_cents=120000 and price_cents=160000 and effective_price_cents=120000 from public.products where id=%L',live_product));
  perform public.save_product_with_arrival(jsonb_set(payload,'{sale_price_cents}','null'::jsonb));
  r:=r||pg_temp.sale_check('Admin clearing sale price restores original',format('select sale_price_cents is null and effective_price_cents=price_cents from public.products where id=%L',live_product));
  execute 'reset role';raise exception using errcode='PZ006',message='Rollback sale QA fixtures';
 exception when sqlstate 'PZ006' then null;when others then r:=r||jsonb_build_object('test','Sale suite execution','pass',false,'error',sqlerrm,'sqlstate',sqlstate);end;
 perform set_config('bella_qa.sale_results',r::text,false);
end $suite$;
select current_setting('bella_qa.sale_results')::jsonb results;
