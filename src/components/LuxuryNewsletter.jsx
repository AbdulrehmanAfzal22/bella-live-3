import {subscribe} from '../services/newsletter';
import {useState} from 'react';
import {toast} from 'sonner';
import Container from './common/Container';
import Input from './common/Input';

export default function LuxuryNewsletter(){
  const [email,setEmail]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  async function submit(event){event.preventDefault();if(busy)return;setBusy(true);setError('');setMessage('');try{await subscribe(email);setMessage('You’re on the list! Welcome to the gloss club.');setEmail('');toast.success('Subscription saved.');}catch(err){setError(err.message||'Please try subscribing again.');}finally{setBusy(false);}}
  return <section className="home-journal gloss-club" id="home-journal" aria-labelledby="home-journal-title">
    <span className="gloss-club__float gloss-club__float--bow" aria-hidden="true">🎀</span><span className="gloss-club__float gloss-club__float--cherry" aria-hidden="true">🍒</span><span className="gloss-club__float gloss-club__float--heart" aria-hidden="true">💗</span>
    <Container width="wide" className="gloss-club__inner">
      <div className="gloss-club__copy"><span className="gloss-club__sticker"><span aria-hidden="true">🍪</span> gloss girls club <span aria-hidden="true">🎀</span></span><h2 id="home-journal-title">Your next<br/><em>gloss crush.</em></h2><p>Fresh shades, new drops and glossy little updates. Straight to your inbox.</p><div className="gloss-club__perks"><span>New arrivals <span aria-hidden="true">🍒</span></span><span>Beauty inspo <span aria-hidden="true">🫧</span></span><span>Inbox love <span aria-hidden="true">💌</span></span></div></div>
      <div className="gloss-club__card"><span className="gloss-club__mail" aria-hidden="true">💌</span><h3>Save me a spot <span aria-hidden="true">🎀</span></h3><p>A little inbox love, from Bella.</p><form onSubmit={submit}><Input className="gloss-club__input" type="email" name="email" label="Email address" autoComplete="email" placeholder="Your email goes here…" required value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/><button className="gloss-club__submit" type="submit" disabled={busy}>{busy?'Joining…':'Count me in'} <span aria-hidden="true">💗</span></button></form>{message&&<p className="gloss-club__success" role="status">{message}</p>}{error&&<p className="gloss-club__error" role="alert">{error}</p>}<p className="gloss-club__privacy">Subscribe to new-arrival emails. Unsubscribe anytime.</p></div>
    </Container>
  </section>;
}
