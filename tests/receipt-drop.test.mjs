import test from 'node:test';
import assert from 'node:assert/strict';
import {preventReceiptNavigation,receiveReceiptDrop} from '../src/lib/receiptDrop.js';

function event(types,files=[]){return {dataTransfer:{types,files},prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};}
test('dropping a screenshot passes the File to the uploader and prevents browser navigation',()=>{
  const file=new File(['image'],'receipt.png',{type:'image/png'}),drop=event(['Files'],[file]);
  let selected;receiveReceiptDrop(drop,value=>{selected=value;});
  assert.equal(selected,file);assert.equal(drop.prevented,true);assert.equal(drop.stopped,true);
});
test('file drops outside checkout and during an upload do not navigate away or start another upload',()=>{
  const file=new File(['image'],'receipt.png'),outside=event(['Files'],[file]);
  preventReceiptNavigation(outside);assert.equal(outside.prevented,true);
  const busy=event(['Files'],[file]);let calls=0;
  receiveReceiptDrop(busy,()=>calls++,true);assert.equal(calls,0);assert.equal(busy.prevented,true);
});
test('text and link drag events keep their usual browser behavior',()=>{
  const link=event(['text/uri-list']);preventReceiptNavigation(link);receiveReceiptDrop(link,()=>assert.fail());
  assert.equal(link.prevented,false);assert.equal(link.stopped,false);
});
