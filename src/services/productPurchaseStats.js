import {supabase} from '../lib/supabase';
import {purchaseDisplayCount} from '../lib/purchaseBanner.js';

// Fetch only public aggregate counts in one request for the displayed products.
// A failed optional badge request must not block the catalog or imply zero sales.
export async function attachPurchaseCounts(products){
  if(!products?.length)return products||[];
  const ids=[...new Set(products.map(product=>product.id).filter(Boolean))];
  try{
    const {data,error}=await supabase.from('product_purchase_stats').select('product_id,purchaser_count').in('product_id',ids);
    if(error)return products.map(product=>({...product,purchase_count:null}));
    const counts=new Map((data||[]).map(row=>[row.product_id,Number(row.purchaser_count)]));
    return products.map(product=>({...product,purchase_count:purchaseDisplayCount(product.id,counts.get(product.id)??0)}));
  }catch{return products.map(product=>({...product,purchase_count:null}));}
}
