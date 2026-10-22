import {Link} from 'react-router-dom';
import GlossTraits from './GlossTraits';

export default function PromoMarquee(){
  const messages=['Girls this is your sign to shop now','Enjoy free delivery on your all orders for limited time.','Made with imported lipgloss base from US 🇺🇸'];
  return <div className="bella-promo bella-promo--pookie">
    <Link className="bella-promo__link" to="/shop" aria-label={`${messages.join(' ')} Glossy, Scented, lightweight, plumping. Shop now`}>
      <span className="bella-promo__sr">{messages.join(' ')} Glossy • Scented • lightweight • plumping</span>
      <span className="bella-promo__track" aria-hidden="true">{[0,1].map(copy=><span className="bella-promo__group" key={copy}>
        <span className="bella-promo__message"><span className="pookie-emoji">🎀</span>{messages[0]}<span className="pookie-emoji">🧸</span></span>
        <span className="bella-promo__message"><span className="pookie-emoji">💌</span>{messages[1]}<span className="pookie-emoji">🍓</span></span>
        <span className="bella-promo__message">{messages[2]}</span>
        <span className="bella-promo__message"><GlossTraits/></span>
      </span>)}</span>
    </Link>
  </div>;
}
