-- Requires a disposable signed-in QA user and two real uploaded QA images.
-- Set bella_qa.user_id, bella_qa.request_id, bella_qa.receipt_path,
-- bella_qa.second_request_id and bella_qa.second_receipt_path before running.
-- Product, order, cart and admin-membership fixtures are rolled back.
do $suite$
declare r jsonb:='[]';uid uuid:=current_setting('bella_qa.user_id')::uuid;req uuid:=current_setting('bella_qa.request_id')::uuid;
 req2 uuid:=current_setting('bella_qa.second_request_id')::uuid;path text:=current_setting('bella_qa.receipt_path');path2 text:=current_setting('bella_qa.second_receipt_path');
 pid uuid:=gen_random_uuid();vid uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();other_uid uuid:=gen_random_uuid();got record;got2 record;payment_id uuid;payment2_id uuid;
 shipping jsonb:='{"full_name":"DISPOSABLE PAYMENT QA","line1":"QA Street","city":"Lahore","country":"Pakistan"}';
begin
 begin
  create temp table pkr_test_scope(x integer);
  execute $helper$create function pg_temp.pkr_check(label text,statement text,expected_state text default null) returns jsonb language plpgsql as $body$
  declare actual boolean;
  begin execute statement into actual;return jsonb_build_object('test',label,'pass',expected_state is null and coalesce(actual,false));
  exception when others then return jsonb_build_object('test',label,'pass',expected_state=sqlstate,'sqlstate',sqlstate,'error',sqlerrm);end $body$;$helper$;
  insert into public.categories(id,name,slug) values(cid,'DISPOSABLE PKR QA','pkr-qa-'||cid);
  insert into public.products(id,name,description,category_id,price_cents,status,new_arrival) values(pid,'DISPOSABLE PKR QA','QA product',cid,129900,'draft',false);
  insert into public.product_images(product_id,path,position) values(pid,pid||'/fixture.jpg',0);
  insert into public.product_variants(id,product_id,color,size,stock) values(vid,pid,'QA','One size',5);
  update public.products set status='published' where id=pid;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  r:=r||pg_temp.pkr_check('Receipt owner can read uploaded file',format('select count(*)=1 from storage.objects where bucket_id=''payment-receipts'' and name=%L',path));
  perform public.add_to_cart(vid,2);
  r:=r||pg_temp.pkr_check('Missing contact number is rejected',format('select count(*)=1 from public.checkout_bank_transfer_v2(%L,%L,''PKR-QA'',%L,'''',''jazzcash'')',shipping,req,path),'P0001');
  r:=r||pg_temp.pkr_check('Unsupported payment provider is rejected',format('select count(*)=1 from public.checkout_bank_transfer_v2(%L,%L,''PKR-QA'',%L,''03210044435'',''other'')',shipping,req,path),'P0001');
  select * into got from public.checkout_bank_transfer_v2(shipping,req,'QA-JAZZ-'||req,path,'+92 321-0044435','jazzcash');
  select id into payment_id from public.payment_submissions where order_id=got.order_id;
  r:=r||pg_temp.pkr_check('JazzCash checkout calculates PKR total on server',format('select total_cents=259800 and currency=''PKR'' and status=''pending'' and payment_status=''unpaid'' from public.orders where id=%L',got.order_id));
  r:=r||pg_temp.pkr_check('JazzCash number, phone, transaction and screenshot saved together',format('select payment_provider=''jazzcash'' and contact_number=''+923210044435'' and transaction_id=%L and screenshot_path=%L and bank_details->>''account_number''=''03210044435'' from public.payment_submissions where order_id=%L','QA-JAZZ-'||req,path,got.order_id));
  r:=r||pg_temp.pkr_check('Order contains purchased product and quantity',format('select count(*)=1 from public.order_items where order_id=%L and product_name=''DISPOSABLE PKR QA'' and quantity=2',got.order_id));
  r:=r||pg_temp.pkr_check('Checkout atomically clears customer cart',format('select count(*)=0 from public.cart_items where user_id=%L',uid));
  r:=r||pg_temp.pkr_check('Checkout reserves correct stock',format('select stock=3 from public.product_variants where id=%L',vid));
  r:=r||pg_temp.pkr_check('Retry returns original JazzCash order',format('select order_id=%L from public.checkout_bank_transfer_v2(%L,%L,''QA-JAZZ'',%L,''03210044435'',''jazzcash'')',got.order_id,shipping,req,path));
  r:=r||pg_temp.pkr_check('Retry does not consume stock again',format('select stock=3 from public.product_variants where id=%L',vid));
  perform public.add_to_cart(vid,1);
  select * into got2 from public.checkout_bank_transfer_v2(shipping,req2,'QA-BANK-'||req2,path2,'03210044435','bank_alfalah');
  select id into payment2_id from public.payment_submissions where order_id=got2.order_id;
  r:=r||pg_temp.pkr_check('Bank Alfalah saves exact account with leading zero',format('select bank_details->>''account_number''=''02351010329869'' and payment_provider=''bank_alfalah'' and contact_number=''03210044435'' from public.payment_submissions where order_id=%L',got2.order_id));
  r:=r||pg_temp.pkr_check('Customer cannot confirm their own order',format('select public.review_bank_payment(%L,''approved'','''') is null',payment_id),'42501');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_uid,'role','authenticated')::text,true);
  r:=r||pg_temp.pkr_check('Another customer cannot see uploaded receipt',format('select count(*)=0 from storage.objects where bucket_id=''payment-receipts'' and name=%L',path));
  r:=r||pg_temp.pkr_check('Another customer cannot see payment proof',format('select count(*)=0 from public.payment_submissions where order_id=%L',got.order_id));
  execute 'reset role';insert into private.admin_members(user_id) values(uid);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);execute 'set local role authenticated';
  perform public.review_bank_payment(payment_id,'approved','Verified in bank');
  r:=r||pg_temp.pkr_check('Admin approval marks paid and confirms order atomically',format('select payment_status=''paid'' and status=''confirmed'' from public.orders where id=%L',got.order_id));
  r:=r||pg_temp.pkr_check('Confirmation is recorded in order history',format('select count(*)=1 from public.order_status_history where order_id=%L and status=''confirmed''',got.order_id));
  perform public.review_bank_payment(payment2_id,'rejected','Amount does not match');
  r:=r||pg_temp.pkr_check('Rejected payment leaves order pending and unpaid',format('select payment_status=''unpaid'' and status=''pending'' from public.orders where id=%L',got2.order_id));
  execute 'reset role';raise exception using errcode='PZ005',message='Rollback live checkout QA fixtures';
 exception when sqlstate 'PZ005' then null;when others then r:=r||jsonb_build_object('test','Live checkout suite execution','pass',false,'error',sqlerrm,'sqlstate',sqlstate);end;
 perform set_config('bella_qa.pkr_results',r::text,false);
end $suite$;
select current_setting('bella_qa.pkr_results')::jsonb results;
