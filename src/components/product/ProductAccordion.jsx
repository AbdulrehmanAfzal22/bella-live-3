import {ChevronDown} from 'lucide-react';

export default function ProductAccordion({product}){
  const sections=[
    {title:'Description',content:product.description||'Product details will be shared soon.'},
    {title:'Ingredients',ingredients:true,content:product.ingredients?.trim()},
    {title:'Shipping',content:'Complimentary shipping on all orders. Delivery timing and tracking details are shared after your order is confirmed.'},
    {title:'Care instructions',content:product.care||'Care instructions will be included with your piece.'},
  ];

  return <section className="product-accordion" aria-label="Product details">{sections.map((section,index)=><details key={section.title} className={section.ingredients?'product-ingredients':undefined} open={index===0||section.ingredients}><summary><span>{section.ingredients&&<span className="product-ingredients__bow" aria-hidden="true">🎀</span>}{section.title}</span><ChevronDown size={17}/></summary>{section.ingredients?<div className="product-ingredients__body">{section.content?<><span className="product-ingredients__label">Inside your gloss</span><p className="product-ingredients__text">{section.content}</p></>:<p className="product-ingredients__empty">Ingredient details will be added soon. Contact us for more information.</p>}</div>:<p>{section.content}</p>}</details>)}</section>;
}
