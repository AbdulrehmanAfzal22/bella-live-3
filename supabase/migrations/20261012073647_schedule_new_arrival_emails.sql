create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Private authentication token stays in a non-exposed schema. No email credentials in SQL.
select cron.schedule('bella-new-arrival-emails','*/5 * * * *',$job$
 select net.http_post(
  url:='https://bpedttjsbmuvtyqehvnx.supabase.co/functions/v1/new-arrival-emails',
  headers:=jsonb_build_object('Content-Type','application/json','x-worker-token',(select token from private.newsletter_worker_config where id)),
  body:='{}'::jsonb,timeout_milliseconds:=10000
 );
$job$);
