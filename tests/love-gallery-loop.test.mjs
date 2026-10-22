import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryVisibleCount,loopGalleryPhotos} from '../src/lib/loveGalleryLoop.js';
test('gallery adjusts its photo count for narrow and wide viewports',()=>{
 assert.equal(galleryVisibleCount(375),2);assert.equal(galleryVisibleCount(750),3);assert.equal(galleryVisibleCount(1200),4);
});
test('the end of the gallery loop displays exactly the same photos as the beginning',()=>{
 for(const length of [1,2,7,9])for(const visible of [2,3,4]){
  const photos=Array.from({length},(_,id)=>({id})),loop=loopGalleryPhotos(photos,visible);
  assert.deepEqual(loop.slice(length,length+visible),loop.slice(0,visible));
 }
});
test('an empty gallery produces no decorative copies',()=>assert.deepEqual(loopGalleryPhotos([],4),[]));
