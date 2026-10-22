import {useState} from 'react';
import {toast} from 'sonner';
import {useQuery} from '../../hooks/useQuery';
import {getOrderPayment,resubmitPayment,receiptUrl} from '../../services/payments';
import {ErrorState} from '../Feedback';
import '../../styles/payments.css';
export default function CustomerPaymentProof({order}){
 const q=useQuery(()=>getOrderPayment(order.id),[order.id]),[contactNumber,setContactNumber]=useState(order.shipping_address?.phone||''),[transactionId,setTransactionId]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[url,setUrl]=useState('');
 async function submit(e){e.preventDefault();setBusy(true);try{await resubmitPayment(order.id,transactionId,file,contactNumber);toast.success('Replacement payment proof submitted.');setFile(null);setUrl('');q.refresh();}catch(err){toast.error(err.message);}finally{setBusy(false);}}
 async function show(){try{setUrl(await receiptUrl(q.data.screenshot_path));}catch(err){toast.error(err.message);}}
 if(q.error)return <ErrorState error={q.error} retry={q.refresh}/>;if(!q.data)return null;
 return <section className="panel payment-customer-proof"><h2>Payment proof</h2><p>Status: <strong>{q.data.status==='pending'?'Awaiting review':q.data.status}</strong></p><p>Payment method: {q.data.payment_provider==='jazzcash'?'JazzCash':'Bank Alfalah'}</p><p>Contact number: {q.data.contact_number||order.shipping_address?.phone}</p><p className="payment-reference">Transaction ID: {q.data.transaction_id}</p>{q.data.review_note&&<p>Store note: {q.data.review_note}</p>}<button className="text-button" type="button" onClick={show}>View your screenshot</button>{url&&<p><a href={url} target="_blank" rel="noreferrer">Open payment screenshot</a></p>}{q.data.status==='rejected'&&order.status!=='cancelled'&&order.payment_status==='unpaid'&&<form onSubmit={submit}><p>Please correct the payment details and submit a new screenshot.</p><label>Contact number<input type="tel" required maxLength={25} value={contactNumber} onChange={e=>setContactNumber(e.target.value)}/></label><label>Transaction ID<input required minLength={3} maxLength={100} value={transactionId} onChange={e=>setTransactionId(e.target.value)}/></label><label>Replacement screenshot<input type="file" required accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="button" disabled={busy}>{busy?'Submitting…':'Resubmit payment proof'}</button></form>}</section>;
}
