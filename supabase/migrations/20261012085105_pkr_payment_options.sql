-- PKR store with JazzCash and Bank Alfalah manual transfers.
alter table public.orders drop constraint orders_currency_check;
alter table public.orders add constraint orders_currency_check check(currency in ('PKR','USD'));
alter table public.orders alter column currency set default 'PKR';
alter table public.bank_transfer_settings drop constraint bank_transfer_settings_check;
alter table public.bank_transfer_settings add constraint bank_transfer_settings_check check(not active or (length(trim(bank_name))>0 and (length(trim(account_number))>0 or length(trim(iban))>0)));
alter table public.bank_transfer_settings add column jazzcash_number text not null default '';
alter table public.bank_transfer_settings add column jazzcash_title text not null default '';
alter table public.bank_transfer_settings add column jazzcash_active boolean not null default false;
alter table public.bank_transfer_settings add column whatsapp_number text not null default '';
alter table public.bank_transfer_settings add constraint jazzcash_account_check check(not jazzcash_active or jazzcash_number ~ '^0[0-9]{10}$');
update public.bank_transfer_settings set bank_name='Bank Alfalah',account_number='02351010329869',account_title='',iban='',active=true,
 jazzcash_number='03210044435',jazzcash_active=true,whatsapp_number='923210044435',
 instructions='Transfer the exact PKR order total to your selected payment account. Submit your contact number, transaction ID and payment screenshot. We will verify the payment and confirm your order.',updated_at=now() where id;
alter table public.payment_submissions add column contact_number text;
alter table public.payment_submissions add column payment_provider text not null default 'bank_alfalah' check(payment_provider in ('bank_alfalah','jazzcash'));
alter table public.payment_submissions add constraint payment_contact_number_check check(contact_number is null or contact_number ~ '^\+?[0-9]{10,15}$');

create function private.checkout_bank_transfer_v2(p_shipping jsonb,p_request_id uuid,p_transaction_id text,p_screenshot_path text,p_contact_number text,p_payment_provider text)
returns table(order_id uuid,order_number bigint,total_cents bigint) language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();settings public.bank_transfer_settings%rowtype;bank jsonb;placed record;phone text:=regexp_replace(trim(coalesce(p_contact_number,'')),'[ ()-]','','g');
begin
 if uid is null then raise exception 'Sign in to checkout' using errcode='28000';end if;
 if p_request_id is null then raise exception 'Checkout request ID is required';end if;
 insert into public.carts(user_id) values(uid) on conflict do nothing;
 perform 1 from public.carts c where c.user_id=uid for update;
 return query select o.id,o.order_number,o.total_cents from public.orders o join public.payment_submissions ps on ps.order_id=o.id where o.user_id=uid and o.request_id=p_request_id and o.payment_method='bank_transfer';
 if found then return;end if;
 if exists(select 1 from public.orders o where o.user_id=uid and o.request_id=p_request_id) then raise exception 'This request belongs to an existing order';end if;
 if phone !~ '^\+?[0-9]{10,15}$' then raise exception 'Enter a valid contact number (10 to 15 digits)';end if;
 if p_payment_provider is null or p_payment_provider not in ('bank_alfalah','jazzcash') then raise exception 'Select JazzCash or Bank Alfalah';end if;
 if length(trim(coalesce(p_transaction_id,''))) not between 3 and 100 then raise exception 'Enter a valid transaction ID';end if;
 if p_screenshot_path is null or p_screenshot_path not like uid::text||'/'||p_request_id::text||'/%' or not exists(select 1 from storage.objects so where so.bucket_id='payment-receipts' and so.name=p_screenshot_path) then raise exception 'Upload your payment screenshot first';end if;
 select * into settings from public.bank_transfer_settings where id for share;
 if p_payment_provider='jazzcash' then
  if not settings.jazzcash_active then raise exception 'JazzCash is temporarily unavailable';end if;
  bank:=jsonb_build_object('bank_name','JazzCash','account_number',settings.jazzcash_number,'account_title',settings.jazzcash_title,'payment_provider','jazzcash','currency','PKR');
 else
  if not settings.active then raise exception 'Bank Alfalah is temporarily unavailable';end if;
  bank:=jsonb_build_object('bank_name',settings.bank_name,'account_number',settings.account_number,'account_title',settings.account_title,'iban',settings.iban,'payment_provider','bank_alfalah','currency','PKR');
 end if;
 select * into placed from private.checkout_impl(jsonb_set(p_shipping,'{phone}',to_jsonb(phone)),0,p_request_id);
 update public.orders o set payment_method='bank_transfer',currency='PKR' where o.id=placed.order_id;
 insert into public.payment_submissions(order_id,user_id,transaction_id,screenshot_path,bank_details,contact_number,payment_provider) values(placed.order_id,uid,trim(p_transaction_id),p_screenshot_path,bank,phone,p_payment_provider);
 return query select placed.order_id,placed.order_number,placed.total_cents;
end $$;
create function public.checkout_bank_transfer_v2(p_shipping jsonb,p_request_id uuid,p_transaction_id text,p_screenshot_path text,p_contact_number text,p_payment_provider text)
returns table(order_id uuid,order_number bigint,total_cents bigint) language sql security invoker set search_path='' as $$select * from private.checkout_bank_transfer_v2($1,$2,$3,$4,$5,$6)$$;
revoke all on function private.checkout_bank_transfer_v2(jsonb,uuid,text,text,text,text),public.checkout_bank_transfer_v2(jsonb,uuid,text,text,text,text) from public,anon;
grant execute on function private.checkout_bank_transfer_v2(jsonb,uuid,text,text,text,text),public.checkout_bank_transfer_v2(jsonb,uuid,text,text,text,text) to authenticated;
create or replace function private.checkout_bank_transfer(p_shipping jsonb,p_request_id uuid,p_transaction_id text,p_screenshot_path text)
returns table(order_id uuid,order_number bigint,total_cents bigint) language sql security invoker set search_path='' as $$select * from private.checkout_bank_transfer_v2($1,$2,$3,$4,$1->>'phone','bank_alfalah')$$;

create or replace function private.update_order_status(p_order_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare current_status text;method text;payment text;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if p_status is null or p_status not in ('pending','confirmed','processing','shipped','delivered','cancelled') then raise exception 'Invalid status';end if;
 select o.status,o.payment_method,o.payment_status into current_status,method,payment from public.orders o where o.id=p_order_id for update;
 if not found then raise exception 'Order not found';end if;
 if current_status=p_status then return;end if;
 if current_status in ('cancelled','delivered') then raise exception 'This order is already closed';end if;
 if method='bank_transfer' and p_status in ('confirmed','processing','shipped','delivered') and payment<>'paid' then raise exception 'Verify and approve the payment in Payments before confirming this order';end if;
 if p_status='cancelled' then
  if current_status='shipped' then raise exception 'A shipped order cannot be cancelled; contact the customer about a return';end if;
  perform pv.id from public.product_variants pv where pv.id in(select oi.variant_id from public.order_items oi where oi.order_id=p_order_id) order by pv.id for update;
  update public.product_variants pv set stock=pv.stock+x.quantity from(select oi.variant_id,sum(oi.quantity)::integer as quantity from public.order_items oi where oi.order_id=p_order_id group by oi.variant_id)x where pv.id=x.variant_id;
 elsif array_position(array['pending','confirmed','processing','shipped','delivered'],p_status)<=array_position(array['pending','confirmed','processing','shipped','delivered'],current_status) then raise exception 'Order status can only move forward';end if;
 update public.orders o set status=p_status where o.id=p_order_id;
 insert into public.order_status_history(order_id,status) values(p_order_id,p_status);
end $$;
create or replace function private.review_bank_payment(p_payment_id uuid,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare submission public.payment_submissions%rowtype;ord public.orders%rowtype;
begin
 if auth.uid() is null or not private.is_admin() then raise exception 'Admin access required' using errcode='42501';end if;
 if p_status is null or p_status not in ('approved','rejected') or length(coalesce(p_note,''))>1000 then raise exception 'Invalid review';end if;
 select o.* into ord from public.orders o where o.id=(select ps.order_id from public.payment_submissions ps where ps.id=p_payment_id) for update;
 select * into submission from public.payment_submissions where id=p_payment_id for update;
 if submission.id is null then raise exception 'Payment not found';end if;
 if submission.status<>'pending' then raise exception 'This payment has already been reviewed';end if;
 if ord.status in ('cancelled','delivered') or ord.payment_status<>'unpaid' then raise exception 'This order cannot receive a payment review';end if;
 if p_status='rejected' and length(trim(coalesce(p_note,'')))=0 then raise exception 'Explain why the payment was rejected';end if;
 update public.payment_submissions set status=p_status,review_note=trim(coalesce(p_note,'')),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=p_payment_id;
 if p_status='approved' then
  perform private.record_payment_status(submission.order_id,'paid');
  if ord.status='pending' then perform private.update_order_status(ord.id,'confirmed');end if;
 end if;
end $$;
create function private.resubmit_bank_payment_v2(p_order_id uuid,p_transaction_id text,p_screenshot_path text,p_contact_number text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();phone text:=regexp_replace(trim(coalesce(p_contact_number,'')),'[ ()-]','','g');
begin
 if uid is null then raise exception 'Sign in first';end if;
 if phone !~ '^\+?[0-9]{10,15}$' then raise exception 'Enter a valid contact number (10 to 15 digits)';end if;
 perform private.resubmit_bank_payment(p_order_id,p_transaction_id,p_screenshot_path);
 update public.payment_submissions set contact_number=phone where order_id=p_order_id and user_id=uid;
 update public.orders set shipping_address=jsonb_set(shipping_address,'{phone}',to_jsonb(phone)) where id=p_order_id and user_id=uid;
end $$;
create function public.resubmit_bank_payment_v2(p_order_id uuid,p_transaction_id text,p_screenshot_path text,p_contact_number text) returns void language sql security invoker set search_path='' as $$select private.resubmit_bank_payment_v2($1,$2,$3,$4)$$;
revoke all on function private.resubmit_bank_payment_v2(uuid,text,text,text),public.resubmit_bank_payment_v2(uuid,text,text,text) from public,anon;
grant execute on function private.resubmit_bank_payment_v2(uuid,text,text,text),public.resubmit_bank_payment_v2(uuid,text,text,text) to authenticated;
