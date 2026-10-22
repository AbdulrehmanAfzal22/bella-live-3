// Product prices are stored in minor units (paisa). Historical orders retain their own currency.
export const STORE_CURRENCY='PKR';
export function money(minorUnits,currency=STORE_CURRENCY){return new Intl.NumberFormat('en-PK',{style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format((minorUnits||0)/100);}
