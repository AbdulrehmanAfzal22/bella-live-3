import {useEffect,useRef,useState} from 'react';
import {useReducedMotion} from 'framer-motion';
import {Instagram,ArrowUpRight} from 'lucide-react';
import {useQuery} from '../hooks/useQuery';
import {getLovePhotos,lovePhotoUrl} from '../services/loveGallery';
import {galleryVisibleCount,loopGalleryPhotos} from '../lib/loveGalleryLoop';

export default function LoveGallery(){
  const query=useQuery(getLovePhotos,[]),photos=query.data||[];
  const viewport=useRef(null),reduced=useReducedMotion();
  const [width,setWidth]=useState(0),[index,setIndex]=useState(0),[animate,setAnimate]=useState(true);
  const visible=galleryVisibleCount(width),step=width/visible;
  useEffect(()=>{
    const node=viewport.current;if(!node)return;
    const resize=()=>setWidth(node.clientWidth);resize();
    const observer=new ResizeObserver(resize);observer.observe(node);
    return ()=>observer.disconnect();
  },[photos.length]);
  useEffect(()=>{setIndex(0);},[photos.map(photo=>photo.id).join('|')]);
  useEffect(()=>{
    if(photos.length<2||reduced)return;
    let visible=true;
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});
    if(viewport.current)observer.observe(viewport.current);
    const timer=window.setInterval(()=>{if(visible&&!document.hidden)setIndex(current=>current+1);},3000);
    return()=>{observer.disconnect();window.clearInterval(timer);};
  },[photos.length,reduced]);
  useEffect(()=>{
    if(!photos.length||index<photos.length)return;
    let frame=0;
    const timer=window.setTimeout(()=>{setAnimate(false);setIndex(0);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>setAnimate(true));});},reduced?0:850);
    return()=>{window.clearTimeout(timer);cancelAnimationFrame(frame);};
  },[index,photos.length,reduced]);
  if(query.error&&!query.data)return null;
  if(!photos.length&&!query.loading)return null;
  const loop=loopGalleryPhotos(photos,visible);
  return <section className="love-gallery" aria-labelledby="love-gallery-title">
    <div className="love-gallery__copy"><p className="love-gallery__eyebrow">Gloss, up close</p><h2 id="love-gallery-title">Why you’ll love us</h2><p>Your everyday dose of glossy lips.</p><p className="love-gallery__features">Glossy • Scented<br/>lightweight • plumping</p><a href={import.meta.env.VITE_INSTAGRAM_URL||'https://www.instagram.com/bellabyrt/'} target="_blank" rel="noreferrer"><Instagram size={17}/> Follow us <ArrowUpRight size={16}/></a></div>
    <div className="love-gallery__viewport" ref={viewport} aria-label="Bella by RT photo gallery">
      {query.loading&&!photos.length?<div className="love-gallery__loading" role="status">Loading the gloss gallery…</div>:<>
        <ul className="bella-promo__sr">{photos.map(photo=><li key={photo.id}>{photo.alt||photo.caption||'Bella by RT lip gloss'}</li>)}</ul>
        <div className="love-gallery__track" aria-hidden="true" style={{transform:`translate3d(-${index*step}px,0,0)`,transition:animate&&!reduced?'transform 800ms cubic-bezier(.22,.61,.36,1)':'none'}}>
          {loop.map((photo,position)=><figure className="love-gallery__photo" key={`${photo.id}:${position}`} style={{width:step||'50%'}}><img src={lovePhotoUrl(photo)} alt="" draggable="false" loading={position<visible?'eager':'lazy'} decoding="async"/>{photo.caption&&<figcaption>{photo.caption}</figcaption>}</figure>)}
        </div>
      </>}
    </div>
  </section>;
}
