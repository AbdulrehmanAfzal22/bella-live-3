export const RECEIPT_MAX_BYTES=5*1024*1024;
export function validatePaymentProof(transactionId,file){
 const value=String(transactionId||'').trim();
 if(value.length<3||value.length>100)throw new Error('Enter a transaction ID between 3 and 100 characters.');
 if(!file)throw new Error('Upload your payment screenshot.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<=0||file.size>RECEIPT_MAX_BYTES)throw new Error('Use a JPEG, PNG or WebP screenshot, up to 5 MB.');
 return value;
}
