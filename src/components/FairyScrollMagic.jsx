import {useEffect,useRef} from 'react';
import {useReducedMotion} from 'framer-motion';
import {startFairyMagic} from '../lib/fairyMagic';

export default function FairyScrollMagic(){
  const canvas=useRef(null);
  const reduced=useReducedMotion();
  useEffect(()=>{
    document.documentElement.dataset.bellaMagic=reduced?'off':'on';
    return ()=>{delete document.documentElement.dataset.bellaMagic;};
  },[reduced]);
  useEffect(()=>{
    if(reduced||!canvas.current)return;
    return startFairyMagic(canvas.current);
  },[reduced]);
  if(reduced)return null;
  return <canvas ref={canvas} className="fairy-scroll-magic" aria-hidden="true"/>;
}
