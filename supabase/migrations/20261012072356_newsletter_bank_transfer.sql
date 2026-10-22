-- Bank-transfer checkout and opt-in new-arrival notifications.
create table public.bank_transfer_settings (
 id boolean primary key default true check(id), bank_name text not null default '',
 account_title text not null default '', account_number text not null default '', iban text not null default '',
 instructions text not null default '', active boolean not null default false,
 updated_at timestamptz not null default now(),
 check(not active or (length(trim(bank_name))>0 and length(trim(account_title))>0 and (length(trim(account_number))>0 or length(trim(iban))>0)))
);
insert into public.bank_transfer_settings(id) values(true);
alter table public.bank_transfer_settings enable row level security;
grant select on public.bank_transfer_settings to anon,authenticated;
grant update on public.bank_transfer_settings to authenticated;
create policy bank_read on public.bank_transfer_settings for select to anon,authenticated using(true);
create policy bank_admin on public.bank_transfer_settings for update to authenticated using((select private.is_admin())) with check((select private.is_admin()));
alter table public.orders add column payment_method text not null default 'cod' check(payment_method in ('cod','bank_transfer'));
create table public.payment_submissions (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
 user_id uuid not null references auth.users(id), transaction_id text not null check(length(trim(transaction_id)) between 3 and 100),
 screenshot_path text not null unique, bank_details jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 review_note text not null default '', reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index payment_transaction_unique on public.payment_submissions(lower(trim(transaction_id)));
create index payment_submissions_user_idx on public.payment_submissions(user_id);
create index payment_submissions_reviewed_by_idx on public.payment_submissions(reviewed_by);
alter table public.payment_submissions enable row level security;
grant select on public.payment_submissions to authenticated;
create policy payment_read on public.payment_submissions for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy receipt_insert on storage.objects for insert to authenticated with check(bucket_id='payment-receipts' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy receipt_read on storage.objects for select to authenticated using(bucket_id='payment-receipts' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())));
create policy receipt_delete_unused on storage.objects for delete to authenticated using(bucket_id='payment-receipts' and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.payment_submissions p where p.screenshot_path=name));

create function private.checkout_bank_transfer(p_shipping jsonb,p_request_id uuid,p_transaction_id text,p_screenshot_path text)
returns table(order_id uuid,order_number bigint,total_cents bigint) language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); bank jsonb; placed record;
begin
 if uid is null then raise exception 'Sign in to checkout' using errcode='28000'; end if;
 if p_request_id is null then raise exception 'Checkout request ID is required';end if;
 -- The existing cart lock also makes retries and simultaneous submits idempotent.
 insert into public.carts(user_id) values(uid) on conflict do nothing;
 perform 1 from public.carts c where c.user_id=uid for update;
 return query select o.id,o.order_number,o.total_cents from public.orders o join public.payment_submissions ps on ps.order_id=o.id where o.user_id=uid and o.request_id=p_request_id and o.payment_method='bank_transfer';
 if found then return;end if;
 if exists(select 1 from public.orders o where o.user_id=uid and o.request_id=p_request_id) then raise exception 'This request belongs to an existing order';end if;
 if length(trim(coalesce(p_transaction_id,''))) not between 3 and 100 then raise exception 'Enter a valid transaction ID';end if;
 if p_screenshot_path not like uid::text||'/'||p_request_id::text||'/%' or not exists(select 1 from storage.objects so where so.bucket_id='payment-receipts' and so.name=p_screenshot_path) then raise exception 'Upload your payment screenshot first';end if;
 select to_jsonb(b) into bank from public.bank_transfer_settings b where b.id and b.active for share;
 if bank is null then raise exception 'Bank transfer is not available yet. Please contact the store.';end if;
 select * into placed from private.checkout_impl(p_shipping,0,p_request_id);
 update public.orders o set payment_method='bank_transfer' where o.id=placed.order_id;
 insert into public.payment_submissions(order_id,user_id,transaction_id,screenshot_path,bank_details) values(placed.order_id,uid,trim(p_transaction_id),p_screenshot_path,bank);
 return query select placed.order_id,placed.order_number,placed.total_cents;
end $$;
create function public.checkout_bank_transfer(p_shipping jsonb,p_request_id uuid,p_transaction_id text,p_screenshot_path text)
returns table(order_id uuid,order_number bigint,total_cents bigint) language sql security invoker set search_path='' as $$select * from private.checkout_bank_transfer($1,$2,$3,$4)$$;
revoke all on function private.checkout_bank_transfer(jsonb,uuid,text,text),public.checkout_bank_transfer(jsonb,uuid,text,text) from public,anon;
grant execute on function private.checkout_bank_transfer(jsonb,uuid,text,text),public.checkout_bank_transfer(jsonb,uuid,text,text) to authenticated;

create function private.review_bank_payment(p_payment_id uuid,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare submission public.payment_submissions%rowtype; ord public.orders%rowtype;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if p_status not in ('approved','rejected') or length(coalesce(p_note,''))>1000 then raise exception 'Invalid review';end if;
 -- Consistent lock order: order before receipt, shared with resubmission.
 select o.* into ord from public.orders o where o.id=(select ps.order_id from public.payment_submissions ps where ps.id=p_payment_id) for update;
 select * into submission from public.payment_submissions where id=p_payment_id for update;
 if submission.id is null then raise exception 'Payment not found';end if;
 if submission.status<>'pending' then raise exception 'This payment has already been reviewed';end if;
 if ord.status='cancelled' or ord.payment_status<>'unpaid' then raise exception 'This order cannot receive a payment review';end if;
 if p_status='rejected' and length(trim(coalesce(p_note,'')))=0 then raise exception 'Explain why the payment was rejected';end if;
 update public.payment_submissions set status=p_status,review_note=trim(coalesce(p_note,'')),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_payment_id;
 if p_status='approved' then perform private.record_payment_status(submission.order_id,'paid');end if;
end $$;
create function public.review_bank_payment(p_payment_id uuid,p_status text,p_note text default '') returns void language sql security invoker set search_path='' as $$select private.review_bank_payment($1,$2,$3)$$;
revoke all on function private.review_bank_payment(uuid,text,text),public.review_bank_payment(uuid,text,text) from public,anon;
grant execute on function private.review_bank_payment(uuid,text,text),public.review_bank_payment(uuid,text,text) to authenticated;
create function private.resubmit_bank_payment(p_order_id uuid,p_transaction_id text,p_screenshot_path text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();ord public.orders%rowtype; ps public.payment_submissions%rowtype;
begin
 if uid is null then raise exception 'Sign in first';end if;
 select * into ord from public.orders where id=p_order_id and user_id=uid for update;
 select * into ps from public.payment_submissions where order_id=p_order_id and user_id=uid for update;
 if ord.id is null or ps.id is null or ps.status<>'rejected' or ord.status='cancelled' or ord.payment_status<>'unpaid' then raise exception 'This order cannot receive a new payment proof';end if;
 if length(trim(coalesce(p_transaction_id,''))) not between 3 and 100 then raise exception 'Enter a valid transaction ID';end if;
 if p_screenshot_path not like uid::text||'/'||p_order_id::text||'/%' or not exists(select 1 from storage.objects where bucket_id='payment-receipts' and name=p_screenshot_path) then raise exception 'Upload the replacement screenshot first';end if;
 update public.payment_submissions set transaction_id=trim(p_transaction_id),screenshot_path=p_screenshot_path,status='pending',review_note='',reviewed_by=null,reviewed_at=null,updated_at=now() where id=ps.id;
end $$;
create function public.resubmit_bank_payment(p_order_id uuid,p_transaction_id text,p_screenshot_path text) returns void language sql security invoker set search_path='' as $$select private.resubmit_bank_payment($1,$2,$3)$$;
revoke all on function private.resubmit_bank_payment(uuid,text,text),public.resubmit_bank_payment(uuid,text,text) from public,anon;
grant execute on function private.resubmit_bank_payment(uuid,text,text),public.resubmit_bank_payment(uuid,text,text) to authenticated;

create table public.newsletter_subscribers (
 id uuid primary key default gen_random_uuid(),email text not null unique check(length(email)<=254),
 active boolean not null default true,unsubscribe_token uuid not null unique default gen_random_uuid(),
 subscribed_at timestamptz not null default now(),unsubscribed_at timestamptz
);
alter table public.newsletter_subscribers enable row level security;
grant select on public.newsletter_subscribers to authenticated;
create policy subscribers_admin on public.newsletter_subscribers for select to authenticated using((select private.is_admin()));
create function private.subscribe_newsletter(p_email text) returns void language plpgsql security definer set search_path='' as $$
declare normalized text:=lower(trim(p_email));
begin
 if normalized is null or length(normalized)>254 or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address';end if;
 insert into public.newsletter_subscribers(email) values(normalized) on conflict(email) do update set active=true,unsubscribed_at=null,subscribed_at=case when not newsletter_subscribers.active then now() else newsletter_subscribers.subscribed_at end;
end $$;
create function public.subscribe_newsletter(p_email text) returns void language sql security invoker set search_path='' as $$select private.subscribe_newsletter($1)$$;
revoke all on function private.subscribe_newsletter(text),public.subscribe_newsletter(text) from public;
grant execute on function private.subscribe_newsletter(text),public.subscribe_newsletter(text) to anon,authenticated;
create function private.unsubscribe_newsletter(p_token uuid) returns void language plpgsql security definer set search_path='' as $$begin update public.newsletter_subscribers set active=false,unsubscribed_at=now() where unsubscribe_token=p_token;end $$;
create function public.unsubscribe_newsletter(p_token uuid) returns void language sql security invoker set search_path='' as $$select private.unsubscribe_newsletter($1)$$;
revoke all on function private.unsubscribe_newsletter(uuid),public.unsubscribe_newsletter(uuid) from public;
grant execute on function private.unsubscribe_newsletter(uuid),public.unsubscribe_newsletter(uuid) to anon,authenticated;
alter table public.products add column new_arrival boolean not null default false;
create table public.newsletter_deliveries (
 id uuid primary key default gen_random_uuid(),product_id uuid references public.products(id) on delete set null,
 subscriber_id uuid not null references public.newsletter_subscribers(id),product_name text not null,description text not null,
 price_cents integer not null,status text not null default 'queued' check(status in ('queued','sending','sent','failed','skipped')),
 attempts integer not null default 0,last_error text,provider_id text,sent_at timestamptz,locked_at timestamptz,
 next_attempt_at timestamptz not null default now(),created_at timestamptz not null default now(),unique(product_id,subscriber_id)
);
create index newsletter_subscriber_idx on public.newsletter_deliveries(subscriber_id);
create index newsletter_pending_idx on public.newsletter_deliveries(status,next_attempt_at);
alter table public.newsletter_deliveries enable row level security;
grant select on public.newsletter_deliveries to authenticated;
create policy delivery_admin on public.newsletter_deliveries for select to authenticated using((select private.is_admin()));
create function private.queue_new_arrival() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and new.new_arrival and (tg_op='INSERT' or old.status is distinct from 'published' or not old.new_arrival) then
  insert into public.newsletter_deliveries(product_id,subscriber_id,product_name,description,price_cents)
  select new.id,s.id,new.name,new.description,new.price_cents from public.newsletter_subscribers s where s.active on conflict(product_id,subscriber_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.queue_new_arrival() from public,anon,authenticated;
create trigger queue_new_arrival after insert or update of status,new_arrival on public.products for each row execute function private.queue_new_arrival();
create function public.save_product_with_arrival(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare pid uuid;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin access required';end if;
 pid:=public.save_product(payload);
 update public.products set new_arrival=coalesce((payload->>'new_arrival')::boolean,false) where id=pid;
 return pid;
end $$;
revoke all on function public.save_product_with_arrival(jsonb) from public,anon;
grant execute on function public.save_product_with_arrival(jsonb) to authenticated;

create table private.newsletter_worker_config(id boolean primary key default true check(id),token text not null default encode(extensions.gen_random_bytes(32),'hex'));
insert into private.newsletter_worker_config(id) values(true);
revoke all on private.newsletter_worker_config from public,anon,authenticated;
create function public.verify_newsletter_worker(p_token text) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from private.newsletter_worker_config where token=p_token)$$;
revoke all on function public.verify_newsletter_worker(text) from public,anon,authenticated;
grant execute on function public.verify_newsletter_worker(text) to service_role;
create function public.claim_newsletter_deliveries() returns table(id uuid,product_id uuid,email text,unsubscribe_token uuid,product_name text,description text,price_cents integer,attempts integer) language plpgsql security definer set search_path='' as $$
begin
 update public.newsletter_deliveries d set status='skipped' where d.status in ('queued','failed','sending') and not exists(select 1 from public.newsletter_subscribers s where s.id=d.subscriber_id and s.active);
 return query with picked as (
  select d.id from public.newsletter_deliveries d where ((d.status in ('queued','failed') and d.next_attempt_at<=now()) or (d.status='sending' and d.locked_at<now()-interval '10 minutes')) and d.attempts<8 order by d.created_at for update skip locked limit 25
 ), claimed as (
  update public.newsletter_deliveries d set status='sending',attempts=d.attempts+1,locked_at=now() from picked p where d.id=p.id returning d.*
 ) select c.id,c.product_id,s.email,s.unsubscribe_token,c.product_name,c.description,c.price_cents,c.attempts from claimed c join public.newsletter_subscribers s on s.id=c.subscriber_id where s.active;
end $$;
revoke all on function public.claim_newsletter_deliveries() from public,anon,authenticated;
grant execute on function public.claim_newsletter_deliveries() to service_role;

grant all on public.newsletter_subscribers,public.newsletter_deliveries,public.payment_submissions,public.bank_transfer_settings to service_role;

-- Bank payments cannot be marked paid without an approved proof, including via legacy order APIs.
create or replace function private.record_payment_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare old_status text;order_status text;method text;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if p_status is null or p_status not in ('unpaid','paid','refunded') then raise exception 'Invalid payment status';end if;
 select o.payment_status,o.status,o.payment_method into old_status,order_status,method from public.orders o where o.id=p_order_id for update;
 if not found then raise exception 'Order not found';end if;
 if old_status=p_status then return;end if;
 if p_status='paid' and order_status='cancelled' then raise exception 'Cannot mark a cancelled order as paid';end if;
 if p_status='paid' and method='bank_transfer' and not exists(select 1 from public.payment_submissions ps where ps.order_id=p_order_id and ps.status='approved') then raise exception 'Approve the payment proof in Payments first';end if;
 if p_status='refunded' and old_status<>'paid' then raise exception 'Only a paid order can be marked refunded';end if;
 if p_status='unpaid' and old_status='refunded' then raise exception 'A refunded payment cannot be marked unpaid';end if;
 update public.orders o set payment_status=p_status where o.id=p_order_id;
 insert into public.admin_notes(order_id,note) values(p_order_id,'Payment recorded as '||p_status||' by admin '||auth.uid()::text);
end $$;
