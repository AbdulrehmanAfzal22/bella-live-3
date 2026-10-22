export function galleryVisibleCount(width){return width>=1000?4:width>=600?3:2;}
export function loopGalleryPhotos(photos,visibleCount){
  if(!photos.length)return [];
  const copies=Math.max(2,Math.ceil(visibleCount/photos.length)+1);
  return Array.from({length:copies},()=>photos).flat();
}
