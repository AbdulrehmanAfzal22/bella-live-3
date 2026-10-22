import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareReceiptImage,saveReceiptImage} from '../src/lib/receiptUpload.js';

const png=()=>new File([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])],'receipt.png',{type:''});

test('valid screenshots with missing or inaccurate MIME types are normalized from their contents',async()=>{
  assert.equal((await prepareReceiptImage(png())).type,'image/png');
  const jpeg=new File([Uint8Array.from([255,216,255,224])],'receipt.jpg',{type:'image/jpg'});
  assert.equal((await prepareReceiptImage(jpeg)).type,'image/jpeg');
  const webp=new File(['RIFF1234WEBP'],'receipt.webp',{type:'application/octet-stream'});
  assert.equal((await prepareReceiptImage(webp)).type,'image/webp');
});

test('renamed HTML, SVG, empty and oversized files cannot be uploaded as receipts',async()=>{
  for(const file of [new File(['<html>not an image</html>'],'receipt.png',{type:'image/png'}),new File(['<svg/>'],'receipt.jpg',{type:'image/jpeg'}),new File([],'empty.png')])await assert.rejects(prepareReceiptImage(file));
  await assert.rejects(prepareReceiptImage({size:5*1024*1024+1}),/5 MB/);
});

test('receipt upload uses the signed-in customer folder and detected MIME type without waiting for a transaction ID',async()=>{
  let call;
  const client={auth:{getUser:async()=>({data:{user:{id:'customer-1'}}})},storage:{from:bucket=>({upload:async(path,file,options)=>{call={bucket,path,file,options};return {data:{path},error:null};}})}};
  const result=await saveReceiptImage(client,png(),'checkout-1',()=> 'unique-image');
  assert.equal(result.path,'customer-1/checkout-1/unique-image.png');
  assert.equal(call.bucket,'payment-receipts');
  assert.equal(call.file.type,'image/png');
  assert.deepEqual(call.options,{contentType:'image/png',upsert:false});
});

test('expired sessions and storage failures are surfaced and never reported as a successful upload',async()=>{
  let calls=0;
  const client={auth:{getUser:async()=>({data:{user:null}})},storage:{from:()=>({upload:async()=>{calls++;return {error:{message:'Permission denied'}};}})}};
  await assert.rejects(saveReceiptImage(client,png(),'checkout-1'),/Sign in again/);assert.equal(calls,0);
  client.auth.getUser=async()=>({data:{user:{id:'customer-1'}}});
  await assert.rejects(saveReceiptImage(client,png(),'checkout-1'),/Screenshot upload failed: Permission denied/);assert.equal(calls,1);
});
