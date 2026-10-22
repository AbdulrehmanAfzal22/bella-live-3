import {MessageCircle} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useQuery} from '../hooks/useQuery';
import {getBankSettings} from '../services/payments';
import {whatsappUrl} from '../lib/paymentOptions';
import WhatsAppIcon from './WhatsAppIcon';
import './FloatingSupportButton.css';
export default function FloatingSupportButton(){const settings=useQuery(getBankSettings,[]);const url=whatsappUrl(settings.data?settings.data.whatsapp_number:'923210044435');return <nav className="floating-support-group" aria-label="Customer support">{url&&<a className="floating-whatsapp-button" href={`${url}?text=${encodeURIComponent('Hello Bella by RT, I need help with my order.')}`} target="_blank" rel="noreferrer" aria-label="Chat with Bella by RT on WhatsApp"><WhatsAppIcon/><span>WhatsApp</span></a>}<Link className="floating-support-button" to="/contact-support" aria-label="Contact Support"><MessageCircle size={19} strokeWidth={1.7} aria-hidden="true"/><span>Contact Support</span></Link></nav>;}
