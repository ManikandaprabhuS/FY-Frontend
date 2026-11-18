import {useEffect,useImperativeHandle,useMemo,useRef,useState,type Ref} from 'react';
import {Image as ImageIcon,ImagePlus,Upload} from 'lucide-react';
import {DEFAULT_PHOTO_MAX_MB,getPhotoMaxBytes,photoSizeError} from '../../../utils/photo-limits';
import type {CheckoutSelection} from '../../../services/checkout.service';
import {useCustomerCommerceStore} from '../../../store/customerCommerceStore';
import {orderPhotoService,validateOrderPhoto,type OrderPhotoInfo} from '../../../services/order-photos.service';
import {listLocalPhotos,saveLocalPhoto,removeLocalPhoto,removeCartPhotos,croppedPhotoFile,type LocalPhoto} from '../../../services/local-photos';
import {showError,showLoading,showSuccess,showWarning} from '../../../utils/toast';
import {FrameSpinner} from '../../../components/loaders/FrameLoader';
export interface CheckoutPhotoHandle {prepare:(maxMB:number)=>Promise<OrderPhotoInfo|null>}
export default function CheckoutPhotoUpload({onChange,onBusy,items=[],maxAllowedMB=DEFAULT_PHOTO_MAX_MB,limitingItem,disabled=false,ref}:{
 onChange:(photo:OrderPhotoInfo|null)=>void;onBusy:(busy:boolean)=>void;items?:CheckoutSelection[];
 maxAllowedMB?:number;disabled?:boolean;limitingItem?:{name:string;variant:string}|null;ref?:Ref<CheckoutPhotoHandle>;
}){
 const cart=useCustomerCommerceStore(s=>s.cartItems);
 const keys=cart.map(i=>i.key).join('|');
 const [photos,setPhotos]=useState<LocalPhoto[]>([]),[selected,setSelected]=useState(''),[ready,setReady]=useState(false);
 const [saved,setSaved]=useState<OrderPhotoInfo|null>(null),[preview,setPreview]=useState('');
 const [progress,setProgress]=useState<number|null>(null),[dragging,setDragging]=useState(false);
 const input=useRef<HTMLInputElement>(null);
 const selectedPhoto=photos.find(p=>p.id===selected);
 const callbacks=useRef({onChange,onBusy});
 useEffect(()=>{callbacks.current={onChange,onBusy};},[onChange,onBusy]);
 const cropKey=cart.find(i=>i.key===selectedPhoto?.cartKey)?.frameSize;
 const file=useMemo(()=>selectedPhoto?croppedPhotoFile(selectedPhoto,cropKey):undefined,[selectedPhoto,cropKey]);
 const max=getPhotoMaxBytes([{maxPhotoSizeMB:maxAllowedMB}]);
 useEffect(()=>{
  let active=true;callbacks.current.onBusy(true);
  void listLocalPhotos().then(async rows=>{
   if(!active)return;
   const matching=rows.filter(p=>p.id==='checkout'||Boolean(p.cartKey&&keys.split('|').includes(p.cartKey)));
   setPhotos(matching);setSaved(null);
   setSelected(previous=>matching.some(p=>p.id===previous)?previous:matching.length===1?matching[0].id:'');
   if(matching.length>1)showWarning('Choose one photo for this order.',{id:'checkout-photo-choice'});
   if(!matching.length){
    try{const temp=await orderPhotoService.current();if(active)setSaved(temp);}
    catch{if(active)showError('Your saved photo could not be checked. Please choose your photo again if needed.',{id:'checkout-photo-load'});}
   }
   if(active)setReady(true);
  }).finally(()=>{if(active)callbacks.current.onBusy(false);});
  return()=>{active=false;};
 },[keys]);
 useEffect(()=>{
  const url=file?URL.createObjectURL(file):'';
  const timer=setTimeout(()=>setPreview(url),0);
  return()=>{clearTimeout(timer);if(url)URL.revokeObjectURL(url);};
 },[file]);
 const size=file?.size??saved?.sizeBytes;
 useEffect(()=>{
  const needsChoice=photos.length>1&&!selected;
  callbacks.current.onBusy(!ready||needsChoice);
  callbacks.current.onChange(file?{imageId:'local:'+selected,fileName:file.name,sizeBytes:file.size}:saved);
  if(size&&size>max)showWarning(photoSizeError(size,max),{id:'checkout-photo-limit'});
 },[ready,photos.length,selected,file,saved,size,max]);
 useImperativeHandle(ref,()=>({prepare:async(maxMB)=>{
  if(photos.length>1&&!selected)throw Object.assign(new Error('Choose one photo for this order.'),{photoValidation:true});
  const limit=getPhotoMaxBytes([{maxPhotoSizeMB:maxMB}]);
  if(size&&size>limit)throw Object.assign(new Error(photoSizeError(size,limit)),{photoValidation:true});
  if(!file)return saved;
  const issue=validateOrderPhoto(file,[{maxPhotoSizeMB:maxMB}]);if(issue)throw Object.assign(new Error(issue),{photoValidation:true});
  if(selectedPhoto&&Date.now()-selectedPhoto.createdAt>=24*60*60*1000)throw Object.assign(new Error('Your local photo has expired. Please choose it again or clear it.'),{photoValidation:true});
  showLoading('Please wait, your photo is being uploaded...','checkout-save');setProgress(0);
  try{
   const result=await orderPhotoService.upload(file,setProgress,items);
   setSaved(result);
   return result;
  }catch(error){
   throw Object.assign(new Error('Your photo could not be uploaded. Please try again.'),{photoUploadFailed:true,cause:error});
  }finally{setProgress(null);}
 }}));
 const choose=async(file:File)=>{
  const issue=validateOrderPhoto(file,[{maxPhotoSizeMB:maxAllowedMB}]);if(issue){showWarning(issue);return;}
  const photo:LocalPhoto={id:'checkout',file,name:file.name,source:'',crops:{},createdAt:Date.now()};
  await removeCartPhotos(photos.flatMap(p=>p.cartKey?[p.cartKey]:[]));
  for(const old of photos)await removeLocalPhoto(old.id);
  const persisted=await saveLocalPhoto(photo);
  if(!persisted)showWarning('Your photo is kept in memory and may be lost on reload.',{id:'local-photo-storage'});
  setPhotos([photo]);setSelected(photo.id);setSaved(null);
 };
 const clear=async()=>{
  try{
   await removeCartPhotos(photos.flatMap(p=>p.cartKey?[p.cartKey]:[]));
   for(const photo of photos)await removeLocalPhoto(photo.id);
   const temp=saved??await orderPhotoService.current();
   if(temp)await orderPhotoService.clear(temp.imageId);
   setPhotos([]);setSelected('');setSaved(null);callbacks.current.onChange(null);
   showSuccess('Photo cleared',{id:'checkout-photo'});
  }catch{showError('Your photo could not be cleared. Please try again.',{id:'checkout-photo'});}
 };
 const shown=file||saved;
 const over=Boolean(size&&size>max);
 return <section className="fy-co-photo" aria-labelledby="checkout-photo-title">
  <h2 id="checkout-photo-title" className="sr-only">Upload your photo (optional)</h2>
  {photos.length>1&&<label className="fy-co-photo__choose">Choose one photo for this order<select disabled={disabled||progress!==null} value={selected} onChange={e=>{setSelected(e.target.value);setSaved(null);}} className="fy-co-select"><option value="">Choose a photo</option>{photos.map(p=><option key={p.id} value={p.id}>{p.name} — {cart.find(i=>i.key===p.cartKey)?.name??'Your photo'}</option>)}</select></label>}
  <div onDragEnter={e=>{e.preventDefault();if(!disabled&&progress===null)setDragging(true);}} onDragOver={e=>e.preventDefault()} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);const file=e.dataTransfer.files[0];if(file&&!disabled&&progress===null)void choose(file);}} className="fy-co-drop" data-dragging={dragging||undefined} data-filled={shown?true:undefined} data-invalid={over||undefined}>
   <input ref={input} aria-label="Choose your order photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||progress!==null} className="sr-only" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void choose(f);}}/>
   <span className="fy-co-drop__thumb" key={preview||saved?.imageId||'empty'}>
    {preview?<img src={preview} alt="Your selected photo"/>:shown?<ImageIcon aria-hidden="true"/>:<ImagePlus aria-hidden="true"/>}
   </span>
   <p className="fy-co-drop__name">
    {shown?file?.name??saved?.fileName:dragging?'Drop to add your photo':'No photo yet'}
    <span>{shown?`${((size??0)/1024/1024).toFixed(1)} MB${over?`, over the ${maxAllowedMB} MB limit`:file?', uploads with your order':', uploaded'}`:<><span className="fy-co-drop__drag">Drop a photo here, or choose one.</span><span className="fy-co-drop__tap">Choose one from your photos.</span></>}</span>
   </p>
   <div className="fy-co-drop__actions">
    <button type="button" disabled={disabled||progress!==null} onClick={()=>input.current?.click()} className="fy-co-btn fy-co-btn--line fy-co-btn--sm"><Upload aria-hidden="true"/>{shown?'Replace':'Choose photo'}</button>
    {(photos.length>0||saved)&&<button type="button" disabled={disabled||progress!==null} onClick={()=>void clear()} className="fy-co-btn fy-co-btn--quiet fy-co-btn--sm">Clear</button>}
   </div>
  </div>
  {progress!==null&&<div className="fy-co-drop__progress" role="progressbar" aria-label="Uploading your photo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{transform:`scaleX(${progress/100})`}}/><p><FrameSpinner/>Uploading your photo… {progress}%</p></div>}
  <p className="fy-co-photo__rules">One photo per order. JPG, PNG or WebP, up to {maxAllowedMB} MB.{limitingItem&&` Limit set by ${limitingItem.name} (${limitingItem.variant}).`} Skip it and our team will contact you if needed.</p>
 </section>;
}
