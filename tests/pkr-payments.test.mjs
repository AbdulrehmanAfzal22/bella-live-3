import test from 'node:test';
import assert from 'node:assert/strict';
import {money} from '../src/lib/money.js';
import {paymentOptions,normalizeContactNumber,whatsappUrl} from '../src/lib/paymentOptions.js';
test('store formats paisa as PKR and respects historical order currency',()=>{assert.match(money(129900),/PKR\s*1,299\.00/);assert.match(money(1299,'USD'),/USD\s*12\.99/);});
test('only available payment accounts appear and account leading zeros are retained',()=>{const settings={active:true,bank_name:'Bank Alfalah',account_number:'02351010329869',jazzcash_active:true,jazzcash_number:'03210044435'};assert.deepEqual(paymentOptions(settings).map(o=>o.number),['03210044435','02351010329869']);assert.equal(paymentOptions({...settings,active:false}).length,1);assert.equal(paymentOptions(null).length,0);});
test('contact numbers are normalized without accepting invalid input',()=>{assert.equal(normalizeContactNumber('+92 321-0044435'),'+923210044435');assert.equal(normalizeContactNumber('03210044435'),'03210044435');for(const value of ['123','hello','++923210044435','03abcd0044435'])assert.throws(()=>normalizeContactNumber(value));});
test('WhatsApp uses an international number and refuses malformed numbers',()=>{assert.equal(whatsappUrl('03210044435'),'https://wa.me/923210044435');assert.equal(whatsappUrl('+923210044435'),'https://wa.me/923210044435');assert.equal(whatsappUrl(''),null);});
