import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const token=req.headers.get('x-worker-token');
 if(!token)return json({error:'Unauthorized'},401);
 const check=await db.rpc('verify_newsletter_worker',{p_token:token});
 if(check.error||check.data!==true)return json({error:'Unauthorized'},401);
 const apiKey=Deno.env.get('RESEND_API_KEY'),sender=Deno.env.get('EMAIL_FROM'),siteUrl=Deno.env.get('SITE_URL');
 if(!apiKey||!sender||!siteUrl)return json({error:'Configure RESEND_API_KEY, EMAIL_FROM and SITE_URL before enabling email delivery.'},503);
 let base:string;try{const u=new URL(siteUrl);if(u.protocol!=='https:')throw new Error();base=u.origin;}catch{return json({error:'SITE_URL must be an HTTPS origin'},503);}
 const claim=await db.rpc('claim_newsletter_deliveries');if(claim.error)return json({error:'Cannot read delivery queue'},500);
 let sent=0,failed=0;
 for(const row of claim.data||[]){
  try{
   // Recheck consent and publication immediately before making the provider call.
   const active=await db.from('newsletter_subscribers').select('active').eq('email',row.email).single();
   const product=await db.from('products').select('status').eq('id',row.product_id).maybeSingle();
   if(active.error||product.error)throw new Error('Cannot verify consent or product visibility');
   if(!active.data?.active||product.data?.status!=='published'){await db.from('newsletter_deliveries').update({status:'skipped',locked_at:null}).eq('id',row.id);continue;}
   const productUrl=`${base}/product/${encodeURIComponent(row.product_id)}`;
   const unsubscribeUrl=`${base}/unsubscribe?token=${encodeURIComponent(row.unsubscribe_token)}`;
   const price=new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',currencyDisplay:'code'}).format(row.price_cents/100);
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':`bella-new-arrival-${row.id}`},body:JSON.stringify({
    from:sender,to:[row.email],subject:`New at Bella by RT: ${row.product_name}`,
    text:`A new arrival is here: ${row.product_name}\n\n${row.description}\n\n${price}\nExplore: ${productUrl}\n\nYou subscribed to Bella by RT new-arrival emails. Unsubscribe: ${unsubscribeUrl}`,
    html:`<div style="font-family:Georgia,serif;max-width:600px;margin:auto;padding:32px;color:#342925"><p>BELLA BY RT · NEW ARRIVAL</p><h1>${escapeHtml(row.product_name)}</h1><p style="white-space:pre-wrap;line-height:1.7">${escapeHtml(row.description)}</p><p><strong>${escapeHtml(price)}</strong></p><p><a href="${productUrl}">Discover this product</a></p><hr/><p style="font:12px Arial,sans-serif">You subscribed to Bella by RT new-arrival emails. <a href="${unsubscribeUrl}">Unsubscribe</a></p></div>`
   })});
   const result=await response.json();
   if(!response.ok)throw new Error(`Email provider ${response.status}: ${String(result.message||'Delivery rejected').slice(0,200)}`);
   const saved=await db.from('newsletter_deliveries').update({status:'sent',provider_id:result.id,sent_at:new Date().toISOString(),last_error:null,locked_at:null}).eq('id',row.id);if(saved.error)throw new Error('Email accepted; delivery status could not be saved');sent++;
  }catch(err){failed++;await db.from('newsletter_deliveries').update({status:'failed',last_error:String((err as Error).message||err).slice(0,500),locked_at:null,next_attempt_at:new Date(Date.now()+Math.min(6*3600000,60000*2**row.attempts)).toISOString()}).eq('id',row.id);}
 }
 return json({sent,failed});
});
