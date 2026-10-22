import {useEffect,useState} from 'react';
import {productShopperNames} from '../lib/purchaseBanner';
import {watchPurchaseCount} from '../services/purchaseCountWatch';
import '../styles/product-purchase-banner.css';

export default function ProductPurchaseBanner({product,className=''}){
  const [live,setLive]=useState(null);
  const id=product?.id;
  useEffect(()=>{setLive(null);return id?watchPurchaseCount(id,setLive):undefined;},[id]);
  const count=live??product?.purchase_count;
  if(count===null || count===undefined)return null;
  const names=productShopperNames(id).slice(0,Math.min(count,2));
  const more=Math.max(0,count-names.length);
  return <div className={`product-purchase-banner ${className}`.trim()}>
    <span className="product-purchase-banner__shoppers" aria-hidden="true">{['rose','lilac'].map(avatar=><span key={avatar}><img src={`/assets/shoppers/${avatar}.svg`} alt="" width="32" height="32" loading="lazy" decoding="async" draggable={false}/></span>)}</span>
    <span className="product-purchase-banner__text">{count===0?<><strong>0 people have bought this</strong><span className="product-purchase-banner__more">Be the first to shop this piece</span></>:names.length===0?<strong>{count.toLocaleString('en-US')} {count===1?'person has':'people have'} bought this</strong>:<><strong>{names.map((name,index)=><span key={name}>{index>0?' & ':''}<bdi>{name}</bdi></span>)}</strong><span className="product-purchase-banner__more">{more>0?`and ${more.toLocaleString('en-US')} more people have bought this`:`${count===1?'has':'have'} bought this`}</span></>}</span>
  </div>;
}
