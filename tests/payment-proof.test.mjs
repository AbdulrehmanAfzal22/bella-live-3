import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePaymentProof,RECEIPT_MAX_BYTES} from '../src/lib/paymentProof.js';
test('payment proof requires a meaningful transaction ID and screenshot',()=>{assert.throws(()=>validatePaymentProof('ab',{type:'image/png',size:2}),/transaction ID/);assert.throws(()=>validatePaymentProof('TX-123',null),/screenshot/);assert.equal(validatePaymentProof(' TX-123 ',{type:'image/jpeg',size:100}),'TX-123');});
test('payment proof refuses empty files, active documents and oversized uploads',()=>{for(const file of [{type:'text/html',size:100},{type:'image/svg+xml',size:100},{type:'image/png',size:0},{type:'image/png',size:RECEIPT_MAX_BYTES+1}])assert.throws(()=>validatePaymentProof('TX-123',file),/JPEG/);assert.equal(validatePaymentProof('TX-123',{type:'image/webp',size:RECEIPT_MAX_BYTES}),'TX-123');});
