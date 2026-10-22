-- Narrow the default Supabase table grants in addition to row-level policies.
revoke all on public.bank_transfer_settings,public.payment_submissions,public.newsletter_subscribers,public.newsletter_deliveries from public,anon,authenticated;
grant select on public.bank_transfer_settings to anon,authenticated;
grant update on public.bank_transfer_settings to authenticated;
grant select on public.payment_submissions,public.newsletter_subscribers,public.newsletter_deliveries to authenticated;
