import {supabase,unwrap} from '../lib/supabase';
export async function subscribe(email){return unwrap(await supabase.rpc('subscribe_newsletter',{p_email:email}));}
export async function unsubscribe(token){return unwrap(await supabase.rpc('unsubscribe_newsletter',{p_token:token}));}
export async function getNewsletterOverview(){const [subscribers,deliveries]=await Promise.all([supabase.from('newsletter_subscribers').select('id,email,active,subscribed_at').order('subscribed_at',{ascending:false}),supabase.from('newsletter_deliveries').select('id,product_name,status,attempts,last_error,sent_at,created_at').order('created_at',{ascending:false}).limit(100)]);return {subscribers:unwrap(subscribers)||[],deliveries:unwrap(deliveries)||[]};}
