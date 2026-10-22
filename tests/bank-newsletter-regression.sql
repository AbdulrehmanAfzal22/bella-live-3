-- Live regression suite: all synthetic fixtures are rolled back, including queued emails.
do $suite$
declare r jsonb:='[]';customer uuid:=gen_random_uuid();other_user uuid:=gen_random_uuid();admin_id uuid:=gen_random_uuid();
 oid uuid:=gen_random_uuid();pid uuid:=gen_random_uuid();cid uuid:=gen_random_uuid();psid uuid:=gen_random_uuid();request_id uuid:=gen_random_uuid();sid uuid;token uuid;
begin
 begin
  insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  values(customer,'authenticated','authenticated','bank-qa-customer@example.invalid',now(),'{"provider":"email"}','{}',now(),now()),
  (other_user,'authenticated','authenticated','bank-qa-other@example.invalid',now(),'{"provider":"email"}','{}',now(),now()),
  (admin_id,'authenticated','authenticated','bank-qa-admin@example.invalid',now(),'{"provider":"email"}','{}',now(),now());
  insert into private.admin_members(user_id) values(admin_id);
  create temp table qa_payment_scope(value int);
  execute $helper$create function pg_temp.assert_check(label text,statement text,expected_state text default null) returns jsonb language plpgsql as $body$
  declare actual boolean;
  begin execute statement into actual;return jsonb_build_object('test',label,'pass',expected_state is null and coalesce(actual,false));
  exception when others then return jsonb_build_object('test',label,'pass',expected_state=sqlstate,'sqlstate',sqlstate,'error',sqlerrm);end $body$;$helper$;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);execute 'set local role anon';
  perform public.subscribe_newsletter('  BANK-QA@EXAMPLE.INVALID ');
  perform public.subscribe_newsletter('bank-qa@example.invalid');
  r:=r||pg_temp.assert_check('Subscriber emails cannot be listed publicly','select count(*)=0 from public.newsletter_subscribers','42501');
  r:=r||pg_temp.assert_check('Invalid subscription email rejected','select public.subscribe_newsletter(''bad value'') is null','P0001');
  r:=r||pg_temp.assert_check('Anonymous checkout refused',format('select count(*)=1 from public.checkout_bank_transfer(''{}'',%L,''TX-123'',''fake'')',gen_random_uuid()),'42501');
  r:=r||pg_temp.assert_check('Anonymous worker claim refused','select count(*)=0 from public.claim_newsletter_deliveries()','42501');
  execute 'reset role';
  select id,unsubscribe_token into sid,token from public.newsletter_subscribers where email='bank-qa@example.invalid';
  r:=r||pg_temp.assert_check('Email normalized and duplicates deduplicated','select count(*)=1 from public.newsletter_subscribers where email=''bank-qa@example.invalid''');
  insert into public.categories(id,name,slug) values(cid,'BANK QA','bank-qa-'||cid);
  insert into public.products(id,name,description,price_cents,category_id,status,new_arrival) values(pid,'BANK QA PRODUCT','New-arrival description for QA',5000,cid,'draft',true);
  insert into public.product_images(product_id,path,position) values(pid,pid||'/qa.jpg',0);
  insert into public.product_variants(product_id,color,size,stock) values(pid,'QA','One size',1);
  update public.products set status='published' where id=pid;
  r:=r||pg_temp.assert_check('Publishing marked arrival queues description',format('select count(*)=1 from public.newsletter_deliveries where product_id=%L and subscriber_id=%L and description=''New-arrival description for QA''',pid,sid));
  update public.products set description='Updated description' where id=pid;
  update public.products set new_arrival=false where id=pid;update public.products set new_arrival=true where id=pid;
  r:=r||pg_temp.assert_check('Edits and repeated arrival flag do not duplicate emails',format('select count(*)=1 from public.newsletter_deliveries where product_id=%L and subscriber_id=%L',pid,sid));
  execute 'set local role anon';perform public.unsubscribe_newsletter(token);execute 'reset role';
  r:=r||pg_temp.assert_check('Unsubscribe disables future email',format('select not active from public.newsletter_subscribers where id=%L',sid));
  insert into public.orders(id,user_id,request_id,status,payment_method,payment_status,subtotal_cents,total_cents,shipping_address) values(oid,customer,request_id,'pending','bank_transfer','unpaid',5000,5000,'{"full_name":"QA"}');
  insert into public.payment_submissions(id,order_id,user_id,transaction_id,screenshot_path,bank_details) values(psid,oid,customer,'TX-QA-'||psid,customer||'/'||oid||'/fixture.jpg','{}');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_user,'role','authenticated')::text,true);execute 'set local role authenticated';
  r:=r||pg_temp.assert_check('Other customer cannot read payment',format('select count(*)=0 from public.payment_submissions where id=%L',psid));
  r:=r||pg_temp.assert_check('Customer cannot approve payment',format('select public.review_bank_payment(%L,''approved'','''') is null',psid),'42501');
  r:=r||pg_temp.assert_check('Customer cannot enable bank transfers','with changed as (update public.bank_transfer_settings set active=false where id returning 1) select count(*)=0 from changed');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated')::text,true);
  r:=r||pg_temp.assert_check('Committed bank checkout retry returns original order',format('select order_id=%L from public.checkout_bank_transfer(''{}'',%L,''TX-RETRY'',''unused'')',oid,request_id));
  r:=r||pg_temp.assert_check('Committed bank checkout retry creates no second order',format('select count(*)=1 from public.orders where user_id=%L and request_id=%L',customer,request_id));
  r:=r||pg_temp.assert_check('Owner can read own payment',format('select count(*)=1 from public.payment_submissions where id=%L',psid));
  r:=r||pg_temp.assert_check('Missing receipt rejected before stock/order mutation',format('select count(*)=1 from public.checkout_bank_transfer(''{"phone":"03210044435"}'',%L,''TX-123'',%L)',gen_random_uuid(),customer||'/missing.jpg'),'P0001');
  r:=r||pg_temp.assert_check('Customer cannot list subscriptions',format('select count(*)=0 from public.newsletter_subscribers where id=%L',sid));
  r:=r||pg_temp.assert_check('Customer cannot resubmit pending payment',format('select public.resubmit_bank_payment(%L,''TX-123'',''missing'') is null',oid),'P0001');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  r:=r||pg_temp.assert_check('Admin can read all payment evidence',format('select count(*)=1 from public.payment_submissions where id=%L',psid));
  r:=r||pg_temp.assert_check('Bank payment cannot bypass proof review',format('select public.set_payment_status(%L,''paid'') is null',oid),'P0001');
  r:=r||pg_temp.assert_check('Unpaid bank order cannot be confirmed outside payment review',format('select public.set_order_status(%L,''confirmed'') is null',oid),'P0001');
  r:=r||pg_temp.assert_check('Rejecting proof requires reason',format('select public.review_bank_payment(%L,''rejected'','''') is null',psid),'P0001');
  perform public.review_bank_payment(psid,'approved','Verified in bank account');
  r:=r||pg_temp.assert_check('Approved receipt marks order paid atomically',format('select payment_status=''paid'' from public.orders where id=%L',oid));
  r:=r||pg_temp.assert_check('Approving bank proof also confirms the order',format('select status=''confirmed'' from public.orders where id=%L',oid));
  r:=r||pg_temp.assert_check('PKR is stored on new orders',format('select currency=''PKR'' from public.orders where id=%L',oid));
  r:=r||pg_temp.assert_check('Already-reviewed payment cannot be approved twice',format('select public.review_bank_payment(%L,''approved'','''') is null',psid),'P0001');
  execute 'reset role';
  update public.orders set payment_status='unpaid' where id=oid;
  update public.payment_submissions set status='pending',review_note='',reviewed_at=null,reviewed_by=null where id=psid;
  execute 'set local role authenticated';
  perform public.review_bank_payment(psid,'rejected','Amount does not match the order');
  r:=r||pg_temp.assert_check('Rejected proof leaves order unpaid',format('select payment_status=''unpaid'' from public.orders where id=%L',oid));
  r:=r||pg_temp.assert_check('Rejection reason is saved for customer',format('select status=''rejected'' and review_note=''Amount does not match the order'' from public.payment_submissions where id=%L',psid));
  perform set_config('request.jwt.claims',jsonb_build_object('sub',customer,'role','authenticated')::text,true);
  r:=r||pg_temp.assert_check('Rejected proof replacement requires uploaded screenshot',format('select public.resubmit_bank_payment(%L,''TX-NEW'',%L) is null',oid,customer||'/'||oid||'/missing.jpg'),'P0001');
  execute 'reset role';
  r:=r||pg_temp.assert_check('Receipts bucket is private with image and size restrictions','select not public and file_size_limit=5242880 and not(''image/svg+xml''=any(allowed_mime_types)) from storage.buckets where id=''payment-receipts''');
  raise exception using errcode='PZ004',message='Rollback all QA fixtures';
 exception when sqlstate 'PZ004' then null;when others then r:=r||jsonb_build_object('test','Suite execution','pass',false,'error',sqlerrm,'sqlstate',sqlstate);end;
 perform set_config('bella_qa.bank_newsletter',r::text,false);
end $suite$;
select current_setting('bella_qa.bank_newsletter')::jsonb results;
