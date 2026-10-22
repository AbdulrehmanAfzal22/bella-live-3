import {useEffect,useId,useRef,useState} from 'react';
import {Upload,CheckCircle2} from 'lucide-react';
import {isReceiptFileDrag,preventReceiptNavigation,receiveReceiptDrop} from '../../lib/receiptDrop';

export default function PaymentScreenshotField({onChange,uploadedFile=null,disabled=false}){
  const inputId=useId();
  const input=useRef(null);
  const [file,setFile]=useState(uploadedFile),[preview,setPreview]=useState('');
  const [uploading,setUploading]=useState(false),[saved,setSaved]=useState(!!uploadedFile),[error,setError]=useState(''),[dragging,setDragging]=useState(false);
  const pending=useRef(false);
  useEffect(()=>{
    if(uploadedFile){setFile(uploadedFile);setSaved(true);}
  },[uploadedFile]);
  useEffect(()=>{
    // Dropping a file outside the target must not navigate away from checkout.
    window.addEventListener('dragover',preventReceiptNavigation);
    window.addEventListener('drop',preventReceiptNavigation);
    return ()=>{window.removeEventListener('dragover',preventReceiptNavigation);window.removeEventListener('drop',preventReceiptNavigation);};
  },[]);
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  async function select(selected){
    if(!selected||disabled||pending.current)return;
    pending.current=true;
    setFile(selected);setSaved(false);setError('');setUploading(true);
    try{const normalized=await onChange(selected);setFile(normalized||selected);setSaved(true);}
    catch(err){setError(err.message||'The screenshot could not be uploaded. Choose it again to retry.');}
    finally{pending.current=false;setUploading(false);if(input.current)input.current.value='';}
  }
  return <div className={`payment-upload${dragging?' is-dragging':''}`} aria-busy={uploading}
    onDragEnter={event=>{if(isReceiptFileDrag(event)){event.preventDefault();if(!disabled&&!uploading)setDragging(true);}}}
    onDragOver={event=>{if(isReceiptFileDrag(event)){event.preventDefault();event.dataTransfer.dropEffect=disabled||uploading?'none':'copy';}}}
    onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget))setDragging(false);}}
    onDrop={event=>{setDragging(false);receiveReceiptDrop(event,select,disabled||uploading);}}>
    <label className="payment-upload__label" htmlFor={inputId}><Upload size={18} aria-hidden="true"/> Payment screenshot <span aria-hidden="true">*</span></label>
    <div className="payment-upload__controls">
      <input ref={input} id={inputId} type="file" name="payment_screenshot" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={disabled||uploading} onChange={event=>select(event.target.files?.[0])} aria-describedby={`${inputId}-status`}/>
    </div>
    <small>Drag your screenshot here or choose a file · JPEG, PNG or WebP · Up to 5 MB</small>
    <div id={`${inputId}-status`} className="payment-upload__status" aria-live="polite">
      {uploading?<p>Uploading {file?.name}… Keep this page open.</p>:saved?<p className="payment-upload__success"><CheckCircle2 size={16} aria-hidden="true"/> Screenshot uploaded: {file?.name}</p>:!error&&<p>Choose an image to upload it before submitting your order.</p>}
      {error&&<><p className="payment-upload__error" role="alert">{error}</p>{file&&<button className="payment-upload__retry" type="button" disabled={disabled||uploading} onClick={()=>select(file)}>Retry upload</button>}</>}
    </div>
    {preview&&<img className="payment-upload-preview" src={preview} alt={saved?'Your uploaded payment screenshot':'Your selected payment screenshot'} onError={()=>setPreview('')}/>}
  </div>;
}
