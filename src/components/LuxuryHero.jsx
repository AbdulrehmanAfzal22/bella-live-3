import {useEffect,useRef,useState} from 'react';
import {ArrowDown} from 'lucide-react';
import GlossTraits from './GlossTraits';
import {Link} from 'react-router-dom';
import '../styles/hero-slideshow.css';

const heroSlides=[
  {src:'/assets/bella-hero-brown-niqab.webp',alt:'Model in a brown niqab holding Bella by RT brown lip gloss'},
  {src:'/assets/bella-hero-blue-hijab.webp',alt:'Model in a blue hijab holding Bella by RT pink lip gloss'},
  {src:'/assets/bella-hero-pink-niqab.webp',alt:'Model in a pink hijab and black niqab holding Bella by RT pink lip gloss'},
  {src:'/assets/bella-hero-green-hijab.webp',alt:'Model in a green hijab holding Bella by RT pink lip gloss beside warm lights'},
];

export default function LuxuryHero(){
  const heroRef=useRef(null);
  const [activeSlide,setActiveSlide]=useState(0);

  useEffect(()=>{
    const timer=window.setInterval(()=>{
      if(!document.hidden)setActiveSlide(current=>(current+1)%heroSlides.length);
    },3000);
    return()=>window.clearInterval(timer);
  },[]);

  useEffect(()=>{
    const hero=heroRef.current;
    if(!hero||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let frame=0;
    const update=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const offset=Math.max(-30,Math.min(30,-hero.getBoundingClientRect().top*.08));
        hero.style.setProperty('--hero-parallax',`${offset}px`);
      });
    };
    window.addEventListener('scroll',update,{passive:true});
    update();
    return()=>{window.removeEventListener('scroll',update);cancelAnimationFrame(frame);};
  },[]);

  return <section ref={heroRef} className="luxury-hero home-hero home-hero--slideshow" aria-labelledby="hero-title">
    <div className="luxury-hero__slides">
      {heroSlides.map((slide,index)=><img key={slide.src} className={`luxury-hero__image${index===activeSlide?' is-active':''}`} src={slide.src} alt={slide.alt} aria-hidden={index!==activeSlide} width="1122" height="1402" fetchPriority={index===0?'high':'auto'} loading="eager" decoding="async"/>)}
    </div>
    <div className="luxury-hero__shade"/>
    <div className="luxury-hero__content">
      <h1 id="hero-title" className="luxury-hero__title hero-enter hero-enter--two"><span>Your everyday dose </span><em>of glossy lips</em></h1>
      <p className="luxury-hero__description hero-enter hero-enter--three"><GlossTraits/></p>
      <Link className="luxury-outline-button pookie-shop-button" to="/shop">Explore the collection <span aria-hidden="true">💗</span></Link>
    </div>
    <a className="luxury-hero__scroll" href="#home-collections-title" aria-label="Scroll to the Bella by RT story"><span>Discover the collection</span><ArrowDown size={15}/></a>
  </section>;
}
