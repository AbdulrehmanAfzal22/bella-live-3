export function paymentOptions(settings){if(!settings)return [];return [
 {id:'jazzcash',name:'JazzCash',number:settings.jazzcash_number,title:settings.jazzcash_title,active:settings.jazzcash_active,logo:'/assets/payments/jazzcash.svg'},
 {id:'bank_alfalah',name:settings.bank_name||'Bank Alfalah',number:settings.account_number||settings.iban,title:settings.account_title,iban:settings.iban,active:settings.active,logo:'/assets/payments/bank-alfalah.svg'}
].filter(option=>option.active&&option.number);}
export function normalizeContactNumber(value){const phone=String(value||'').trim().replace(/[ ()-]/g,'');if(!/^\+?\d{10,15}$/.test(phone))throw new Error('Enter a valid contact number (10 to 15 digits).');return phone;}
export function whatsappUrl(value){const digits=String(value||'').replace(/\D/g,'');const number=digits.startsWith('0')?'92'+digits.slice(1):digits;if(!/^\d{10,15}$/.test(number))return null;return `https://wa.me/${number}`;}
