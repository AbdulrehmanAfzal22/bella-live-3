import {purchaseSeeds} from './purchaseSeeds.js';

export const shopperNames=Object.freeze(['Ayesha','Zainab','Fatima','Hafsa','Maryam','Hania','Iqra','Sana','Mahnoor','Alina','Laiba','Dua','Amna','Eman']);

// Each existing product owns its pair: no alias is reused across products.
const shopperPairs=Object.freeze(Object.fromEntries(
  Object.keys(purchaseSeeds).map((id,index)=>[id,Object.freeze(shopperNames.slice(index*2,index*2+2))])
));

export function purchaseDisplayCount(productId,value){
  if(value===null||value===undefined)return null;
  const count=Number(value);
  if(!Number.isSafeInteger(count)||count<0)return null;
  return (purchaseSeeds[productId]||0)+count;
}

// Decorative aliases only; never read customer identities or photographs.
export function productShopperNames(productId){
  // Future products show their count without borrowing another product's names.
  return [...(shopperPairs[productId]||[])];
}

export function purchaseBannerText(value){
  const count=Number(value);
  if(!Number.isSafeInteger(count)||count<1)return 'Be the first to shop this piece';
  return `${count.toLocaleString('en-US')} ${count===1?'person has':'people have'} purchased`;
}
