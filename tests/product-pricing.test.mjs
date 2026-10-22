import test from 'node:test';
import assert from 'node:assert/strict';
import {sellingPrice,hasSale,parseSalePrice} from '../src/lib/productPricing.js';
test('original price is used when sale price is absent',()=>{for(const sale of [null,undefined,'']){const p={price_cents:160000,sale_price_cents:sale};assert.equal(sellingPrice(p),160000);assert.equal(hasSale(p),false);}assert.equal(parseSalePrice(1600,''),null);});
test('valid sale price is used in totals while original price remains available',()=>{const p={price_cents:160000,sale_price_cents:130000};assert.equal(sellingPrice(p),130000);assert.equal(hasSale(p),true);assert.equal(p.price_cents,160000);assert.equal(parseSalePrice(1600,'1300'),130000);assert.equal(sellingPrice(p)*2,260000);});
test('zero, negative, equal, higher and non-numeric sale prices are refused',()=>{for(const sale of ['0','-1','1600','1800','nope'])assert.throws(()=>parseSalePrice(1600,sale),/lower than the original/);assert.equal(sellingPrice({price_cents:160000,sale_price_cents:180000}),160000);});
test('decimal sale prices use integer paisa and never round to the original price',()=>{assert.equal(parseSalePrice(1600,'1499.99'),149999);assert.throws(()=>parseSalePrice(1600,'1599.999'),/lower than the original/);});
