import {money} from '../lib/supabase';
import {hasSale,sellingPrice} from '../lib/productPricing';
export default function ProductPrice({product,className=''}){const onSale=hasSale(product);return <span className={`product-price ${onSale?'product-price--sale':''} ${className}`.trim()}>{onSale&&<del aria-label="Original price">{money(product.price_cents)}</del>}<strong aria-label={onSale?'Sale price':'Price'}>{money(sellingPrice(product))}</strong></span>;}
