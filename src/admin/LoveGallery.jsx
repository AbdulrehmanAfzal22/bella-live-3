import {useRef,useState} from 'react';
import {Upload,ImagePlus,Save,Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {useQuery} from '../hooks/useQuery';
import {getLovePhotos,lovePhotoUrl,addLovePhoto,saveLovePhoto,deleteLovePhoto} from '../services/loveGallery';
import {Loading,ErrorState} from '../components/Feedback';

function PhotoCard({photo,refresh}){
  const [form,setForm]=useState({alt:photo.alt,caption:photo.caption,display_order:photo.display_order,is_active:photo.is_active}),[busy,setBusy]=useState(false);
  async function save(event){event.preventDefault();setBusy(true);try{await saveLovePhoto(photo.id,form);await refresh();toast.success('Photo updated.');}catch(error){toast.error(error.message);}finally{setBusy(false);}}
  async function remove(){if(!window.confirm('Remove this photo from the homepage gallery?'))return;setBusy(true);try{const result=await deleteLovePhoto(photo);await refresh();toast.success('Photo removed.');if(result.cleanupError)toast.error('Photo hidden; its stored file could not be cleaned up.');}catch(error){toast.error(error.message);}finally{setBusy(false);}}
  return <article className="panel love-admin__card"><img src={lovePhotoUrl(photo)} alt={photo.alt||'Gallery photo'}/><form onSubmit={save}><label>Caption<input maxLength={180} value={form.caption} onChange={e=>setForm({...form,caption:e.target.value})} disabled={busy} placeholder="Optional text shown on the photo"/></label><label>Image description<input maxLength={240} value={form.alt} onChange={e=>setForm({...form,alt:e.target.value})} disabled={busy} placeholder="Describe the lip gloss photo"/></label><div className="love-admin__row"><label>Display order<input type="number" min="0" step="1" value={form.display_order} onChange={e=>setForm({...form,display_order:e.target.value})} required disabled={busy}/></label><label className="check"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})} disabled={busy}/> Show on homepage</label></div><div className="love-admin__actions"><button className="button" disabled={busy}><Save size={14}/> Save</button><button type="button" className="button outline" disabled={busy} onClick={remove}><Trash2 size={14}/> Remove</button></div></form></article>;
}

export default function LoveGalleryAdmin(){
  const query=useQuery(()=>getLovePhotos(true),[]),input=useRef(null),lock=useRef(false);
  const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[errors,setErrors]=useState([]),[dragging,setDragging]=useState(false);
  async function upload(files){
    if(!files.length||lock.current)return;
    lock.current=true;setBusy(true);setErrors([]);setDragging(false);
    let position=Math.max(-1,...(query.data||[]).map(photo=>photo.display_order))+1,added=0;
    const failures=[];
    try{
      for(let index=0;index<files.length;index++){
        setProgress(`Uploading photo ${index+1} of ${files.length}…`);
        try{await addLovePhoto(files[index],position++);added++;}catch(error){failures.push(`${files[index].name}: ${error.message}`);}
      }
      await query.refresh();setErrors(failures);setProgress(added?`${added} ${added===1?'photo':'photos'} added to the gallery.`:'No photos added. Please try again.');
      if(added)toast.success(`${added} ${added===1?'photo':'photos'} uploaded.`);
    }finally{lock.current=false;setBusy(false);if(input.current)input.current.value='';}
  }
  return <div className="love-admin"><div className="section-heading admin-page-heading"><div><p className="eyebrow">HOMEPAGE GALLERY</p><h1>Why you love us</h1><p>Add your lip gloss photos here. The homepage advances automatically every three seconds.</p></div><button type="button" className="button outline" onClick={query.refresh} disabled={busy}>Refresh</button></div>
    <section className={`panel love-admin__upload${dragging?' is-dragging':''}`} onDragOver={event=>{event.preventDefault();if(!busy)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);upload(Array.from(event.dataTransfer.files));}} aria-busy={busy}>
      <ImagePlus size={32}/><h2>Add your photos</h2><p>Select or drag in 8–9 photos together. JPEG, PNG or WebP, up to 5 MB each.</p><label className="love-admin__file"><Upload size={17}/><span>Choose photos</span><input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={event=>upload(Array.from(event.target.files||[]))}/></label><p className="love-admin__progress" role="status">{progress}</p>{errors.length>0&&<ul className="love-admin__errors" role="alert">{errors.map((error,index)=><li key={index}>{error}</li>)}</ul>}
    </section>
    <p className="love-admin__hint">Lower display-order numbers appear first. Hide a photo to keep it saved without showing it. The starting photos use your existing product images; removing them here keeps the products unchanged.</p>
    {query.loading&&!query.data?<Loading label="Loading gallery photos…"/>:query.error&&!query.data?<ErrorState error={query.error} retry={query.refresh}/>:query.data?.length?<div className="love-admin__grid">{query.data.map(photo=><PhotoCard key={`${photo.id}:${photo.updated_at}`} photo={photo} refresh={query.refresh}/>)}</div>:<section className="panel"><p>Your gallery is empty. Upload photos above to show this section on your homepage.</p></section>}
  </div>;
}
