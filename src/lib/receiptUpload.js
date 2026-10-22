import {RECEIPT_MAX_BYTES} from './paymentProof.js';
import {uuid} from './uuid.js';

export async function prepareReceiptImage(file){
  if(!file)throw new Error('Choose your payment screenshot.');
  if(file.size<=0||file.size>RECEIPT_MAX_BYTES)throw new Error('Choose a screenshot up to 5 MB.');
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  const type=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':null;
  if(!type)throw new Error('Choose a JPEG, PNG or WebP image. Other formats can be saved as PNG or JPEG first.');
  // Some browsers provide an empty or nonstandard MIME type for valid screenshots.
  return file.type===type?file:new File([file],file.name||'payment-screenshot',{type,lastModified:file.lastModified});
}

export async function saveReceiptImage(client,selectedFile,requestId,createId=uuid){
  const file=await prepareReceiptImage(selectedFile);
  const {data,error}=await client.auth.getUser();
  if(error||!data?.user)throw new Error('Sign in again before uploading your payment screenshot.');
  const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const path=`${data.user.id}/${requestId}/${createId()}.${extension}`;
  const {error:uploadError}=await client.storage.from('payment-receipts').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw new Error(`Screenshot upload failed: ${uploadError.message||'Check your connection and try again.'}`);
  return {file,path};
}
