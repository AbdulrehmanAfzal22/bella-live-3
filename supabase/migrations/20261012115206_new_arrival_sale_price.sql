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
