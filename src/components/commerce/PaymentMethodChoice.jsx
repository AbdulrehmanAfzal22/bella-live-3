import {Banknote,WalletCards} from 'lucide-react';
import {money} from '../../lib/supabase';

export default function PaymentMethodChoice({method,onChange,contactNumber,onContactChange,amount,busy=false}){
  const options=[{id:'bank_transfer',title:'Bank transfer',description:'JazzCash or Bank Alfalah',Icon:WalletCards},{id:'cod',title:'Cash on Delivery',description:'Pay when your order arrives',Icon:Banknote}];
  return <section className="checkout-section checkout-payment-choice" aria-labelledby="payment-choice-title">
    <div className="checkout-section__heading"><span>02</span><div><p className="commerce-eyebrow">Your preferred way to pay</p><h2 id="payment-choice-title">Choose payment</h2></div></div>
    <fieldset className="checkout-payment-choice__options"><legend className="visually-hidden">Payment method</legend>{options.map(({id,title,description,Icon})=><label key={id} className={`checkout-payment-choice__option${method===id?' is-selected':''}`}><input type="radio" name="payment_method" value={id} checked={method===id} onChange={()=>onChange(id)} disabled={busy}/><Icon size={23} aria-hidden="true"/><span><strong>{title}</strong><small>{description}</small></span></label>)}</fieldset>
    {method==='cod'&&<div className="checkout-cod-details"><p>Pay <strong>{money(amount)}</strong> in cash when your order arrives. No advance transfer or payment screenshot is needed.</p><label className="checkout-field" htmlFor="cod-contact-number"><span>Contact number <sup aria-hidden="true">*</sup></span><input id="cod-contact-number" name="phone" type="tel" autoComplete="tel" value={contactNumber} onChange={e=>onContactChange(e.target.value)} required maxLength={25} disabled={busy} placeholder="03XXXXXXXXX or +923XXXXXXXXX"/></label><small>Our team will use this number to confirm your order and arrange delivery.</small></div>}
  </section>;
}
