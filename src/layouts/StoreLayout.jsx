import {Outlet,useLocation} from 'react-router-dom';
import {motion,useReducedMotion} from 'framer-motion';
import {getStoreRouteMetadata} from '../config/routeMetadata';
import {usePageMetadata} from '../hooks/usePageMetadata';
import LuxuryHeader from '../components/LuxuryHeader';
import LuxuryFooter from '../components/LuxuryFooter';
import LuxuryNewsletter from '../components/LuxuryNewsletter';
import FloatingSupportButton from '../components/FloatingSupportButton';
import FairyScrollMagic from '../components/FairyScrollMagic';
import PackagingGlow from '../components/PackagingGlow';
import PromoMarquee from '../components/PromoMarquee';
import PookieAtmosphere from '../components/PookieAtmosphere';
import './StoreLayout.css';
export default function StoreLayout(){
	const location=useLocation();
	const reducedMotion=useReducedMotion();
	const home=location.pathname==='/';
	const metadata=getStoreRouteMetadata(location.pathname,location.search);
	usePageMetadata(metadata);

	return <div className={`bella-storefront${location.pathname.startsWith('/product/')?' bella-storefront--product':''}`}>
		<PackagingGlow/>
		<PookieAtmosphere/>
		<a className="skip-link" href="#main">Skip to content</a>
		<PromoMarquee/>
		<LuxuryHeader home={home}/>
		<motion.main id="main" tabIndex="-1" initial={{opacity:1}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion?0:.45,ease:[.22,1,.36,1]}}><Outlet/></motion.main>
		<LuxuryNewsletter/>
		<LuxuryFooter/>
		<FloatingSupportButton/>
		<FairyScrollMagic/>
	</div>;
}
