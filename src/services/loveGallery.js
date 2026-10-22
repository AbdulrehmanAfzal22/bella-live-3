import {supabase,unwrap} from '../lib/supabase';
import {uuid} from '../lib/uuid';
import {prepareReceiptImage} from '../lib/receiptUpload';

export async function getLovePhotos(admin=false){
  let query=supabase.from('love_gallery_photos').select('*').order('display_order').order('created_at').order('id');
  if(!admin)query=query.eq('is_active',true);
  return unwrap(await query);
}
export const lovePhotoUrl=photo=>supabase.storage.from(photo.source_bucket||'love-gallery').getPublicUrl(photo.image_path).data.publicUrl;
export async function addLovePhoto(selectedFile,displayOrder){
  let file;
  try{file=await prepareReceiptImage(selectedFile);}catch(error){throw new Error(error.message.replaceAll('screenshot','photo'));}
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const path=`gallery/${uuid()}.${ext}`;
  const storage=supabase.storage.from('love-gallery');
  unwrap(await storage.upload(path,file,{contentType:file.type,upsert:false}));
  try{return unwrap(await supabase.from('love_gallery_photos').insert({image_path:path,source_bucket:'love-gallery',alt:'Bella by RT lip gloss',display_order:displayOrder}).select().single());}
  catch(error){await storage.remove([path]);throw error;}
}
export async function saveLovePhoto(id,values){
  const displayOrder=Number(values.display_order);
  if(!Number.isInteger(displayOrder)||displayOrder<0)throw new Error('Photo order must be a whole number of zero or more.');
  return unwrap(await supabase.from('love_gallery_photos').update({alt:values.alt.trim(),caption:values.caption.trim(),display_order:displayOrder,is_active:!!values.is_active}).eq('id',id).select().single());
}
export async function deleteLovePhoto(photo){
  const deleted=unwrap(await supabase.from('love_gallery_photos').delete().eq('id',photo.id).select('id').single());
  if(photo.source_bucket==='love-gallery'&&/^gallery\/[a-f0-9-]+\.(jpg|png|webp)$/.test(photo.image_path)){
    const {error}=await supabase.storage.from('love-gallery').remove([photo.image_path]);
    if(error)return {...deleted,cleanupError:error.message};
  }
  return deleted;
}
