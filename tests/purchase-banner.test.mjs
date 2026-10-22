import test from 'node:test';
import assert from 'node:assert/strict';
import {purchaseBannerText,purchaseDisplayCount,productShopperNames,shopperNames} from '../src/lib/purchaseBanner.js';
import {purchaseSeeds} from '../src/lib/purchaseSeeds.js';

test('existing products keep fixed starting counts and add confirmed purchasers',()=>{
  assert.equal(Object.keys(purchaseSeeds).length,7);
  for(const [id,seed] of Object.entries(purchaseSeeds)){
    assert.ok(seed>=100&&seed<=500);
    assert.equal(purchaseDisplayCount(id,0),seed);
    assert.equal(purchaseDisplayCount(id,1),seed+1);
    assert.equal(purchaseDisplayCount(id,8),seed+8);
    assert.equal(purchaseDisplayCount(id,0),seed);
  }
});

test('future products start at zero and database failures never invent counts',()=>{
  assert.equal(purchaseDisplayCount('new-product',0),0);
  assert.equal(purchaseDisplayCount('new-product',1),1);
  for(const value of [null,undefined,-1,1.5,'invalid',Infinity]){
    assert.equal(purchaseDisplayCount(Object.keys(purchaseSeeds)[0],value),null);
  }
});

test('each product has two distinct stable aliases from the requested list',()=>{
  const pairs=Object.keys(purchaseSeeds).map(id=>{
    const names=productShopperNames(id);
    assert.equal(names.length,2);
    assert.notEqual(names[0],names[1]);
    assert.ok(names.every(name=>shopperNames.includes(name)));
    assert.deepEqual(productShopperNames(id),names);
    return names.join(',');
  });
  assert.equal(new Set(pairs.flatMap(pair=>pair.split(','))).size,14);
  assert.ok(shopperNames.every(name=>/^[A-Za-z]+$/.test(name)));
  assert.deepEqual(productShopperNames('future-product'),[]);
});

test('purchase banner uses each product total and correct singular/plural wording',()=>{
  assert.equal(purchaseBannerText(1),'1 person has purchased');
  assert.equal(purchaseBannerText(758),'758 people have purchased');
  assert.equal(purchaseBannerText('1530'),'1,530 people have purchased');
});

test('purchase banner does not invent a purchase total for zero or invalid counts',()=>{
  for(const count of [0,null,undefined,-1,1.5,'unknown',Infinity]){
    assert.equal(purchaseBannerText(count),'Be the first to shop this piece');
  }
});
