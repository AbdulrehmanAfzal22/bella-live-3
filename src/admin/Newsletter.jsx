import {useQuery} from '../hooks/useQuery';
import {getNewsletterOverview} from '../services/newsletter';
import {Loading,ErrorState} from '../components/Feedback';
import DataTable from '../components/admin/DataTable';
export default function Newsletter(){
 const q=useQuery(getNewsletterOverview,[]);
 const subscriberColumns=[{key:'email',label:'Email'},{key:'active',label:'Status',render:s=>s.active?'Active':'Unsubscribed'},{key:'subscribed_at',label:'Subscribed',render:s=><time dateTime={s.subscribed_at}>{new Date(s.subscribed_at).toLocaleString()}</time>}];
 const deliveryColumns=[{key:'product_name',label:'Product'},{key:'status',label:'Status'},{key:'attempts',label:'Attempts'},{key:'sent_at',label:'Sent / error',render:d=>d.sent_at?<time dateTime={d.sent_at}>{new Date(d.sent_at).toLocaleString()}</time>:d.last_error||'—'}];
 return <><div className="section-heading admin-page-heading"><div><p className="eyebrow">JOURNAL</p><h1>Subscribers & new arrivals</h1><p>New arrivals use the product description and are queued when published.</p></div><button className="button" onClick={q.refresh}>Refresh</button></div>{q.loading&&!q.data?<Loading/>:q.error?<ErrorState error={q.error} retry={q.refresh}/>:<><section className="panel"><h2>Subscribers · {q.data?.subscribers.filter(s=>s.active).length||0} active</h2><DataTable caption="Subscribers" columns={subscriberColumns} rows={q.data?.subscribers||[]}/></section><section className="panel"><h2>Latest 100 email deliveries</h2><p className="muted">Queued messages require the email sender to be configured. Failed deliveries retry automatically, up to 8 attempts.</p><DataTable caption="Email deliveries" columns={deliveryColumns} rows={q.data?.deliveries||[]}/></section></>}</>;
}
