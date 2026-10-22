import {useEffect,useRef} from 'react';

const charms=[{emoji:'🎀',x:'1.6%',y:'24%',size:30},{emoji:'🫧',x:'95%',y:'34%',size:26},{emoji:'💗',x:'2.2%',y:'61%',size:24},{emoji:'🍒',x:'95.5%',y:'72%',size:27},{emoji:'✨',x:'7%',y:'88%',size:20},{emoji:'🎀',x:'89%',y:'14%',size:24}];
export default function PookieAtmosphere(){
  const ref=useRef(null);
  useEffect(()=>{const sync=()=>{if(ref.current)ref.current.dataset.paused=document.hidden?'true':'false';};document.addEventListener('visibilitychange',sync);sync();return()=>document.removeEventListener('visibilitychange',sync);},[]);
  return <div className="pookie-atmosphere" ref={ref} aria-hidden="true">{charms.map((charm,index)=><span className="pookie-atmosphere__charm" key={index} style={{left:charm.x,top:charm.y,fontSize:charm.size,'--charm-delay':`${index*-.9}s`}}>{charm.emoji}</span>)}</div>;
}
