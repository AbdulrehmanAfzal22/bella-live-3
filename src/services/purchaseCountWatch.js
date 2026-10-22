import {attachPurchaseCounts} from './productPurchaseStats';

// Share a single batched poll across cards and the detail page.
const listeners=new Map();
let timer=null;
let pending=false;
async function refresh(){
  if(pending||document.hidden||!listeners.size)return;
  pending=true;
  try{
    const products=await attachPurchaseCounts([...listeners.keys()].map(id=>({id})));
    for(const product of products){
      if(product.purchase_count!==null){
        for(const notify of listeners.get(product.id)||[])notify(product.purchase_count);
      }
    }
  }finally{pending=false;}
}
export function watchPurchaseCount(id,notify){
  if(!listeners.has(id))listeners.set(id,new Set());
  listeners.get(id).add(notify);
  if(!timer){
    timer=window.setInterval(refresh,30000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
  }
  return ()=>{
    const callbacks=listeners.get(id);
    callbacks?.delete(notify);
    if(!callbacks?.size)listeners.delete(id);
    if(!listeners.size){
      window.clearInterval(timer);timer=null;
      window.removeEventListener('focus',refresh);
      document.removeEventListener('visibilitychange',refresh);
    }
  };
}
