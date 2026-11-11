import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Upload } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { checkoutPhotoDraft, clearCheckoutPhotoDraft, orderPhotoService, validateOrderPhoto, type OrderPhotoInfo } from '../../../services/order-photos.service';
import { showError, showLoading, showSuccess, showWarning } from '../../../utils/toast';

export default function CheckoutPhotoUpload({onChange, onBusy}: {onChange: (photo: OrderPhotoInfo | null) => void; onBusy: (value: boolean) => void}) {
  const user = useAuthStore(s => s.user);
  const [photo, setPhoto] = useState<OrderPhotoInfo | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(true);
  const [progress, setProgress] = useState(0);
  const lock = useRef(false);
  const latestFile = useRef<File | undefined>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const callbacks = useRef({onChange, onBusy});
  const owner = useRef(user?.id);
  useEffect(() => { callbacks.current = {onChange, onBusy}; owner.current = user?.id; }, [onChange, onBusy, user?.id]);
  const setStatus = useCallback((value: boolean) => { setBusy(value); callbacks.current.onBusy(value); }, []);
  const upload = useCallback(async function uploadFile(file: File): Promise<void> {
    if (lock.current) return;
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated || auth.user?.role !== 'CUSTOMER') { showWarning('Please log in to upload your photo.'); return; }
    const issue = validateOrderPhoto(file); if (issue) {showWarning(issue); return;}
    const userId = auth.user.id;
    latestFile.current = file; lock.current = true; setStatus(true); setProgress(0);
    showLoading('Please wait, your photo is being uploaded...', 'checkout-photo');
    callbacks.current.onChange(null); setPhoto(null);
    const localUrl = URL.createObjectURL(file); setPreview(localUrl);
    try {
      const saved = await orderPhotoService.upload(file, setProgress);
      if (owner.current !== userId) return;
      setPhoto(saved); callbacks.current.onChange(saved); clearCheckoutPhotoDraft(userId, file);
      showSuccess('Photo uploaded successfully', {id: 'checkout-photo'});
    } catch {
      showError('Your photo could not be uploaded. Please try again.', {id: 'checkout-photo', retry: () => { void uploadFile(file); }});
    } finally { lock.current = false; if (owner.current === userId) setStatus(false); }
  }, [setStatus]);
  useEffect(() => {
    let active = true;
    const id = user?.role === 'CUSTOMER' ? user.id : undefined;
    if (!id) return;
    void orderPhotoService.current().then(async saved => {
      if (!active) return;
      setPhoto(saved); callbacks.current.onChange(saved);
      const local = checkoutPhotoDraft(id);
      if (local) await upload(local);
    }).catch(() => {
      if (active) showError('Your saved photo could not be checked. You can retry or place an order without a photo.', {id:'checkout-photo-load', retry:()=>{void orderPhotoService.current().then(saved=>{setPhoto(saved);callbacks.current.onChange(saved);}).catch(()=>showError('Your saved photo could not be checked. Please try again.',{id:'checkout-photo-load'}));}});
    }).finally(()=>{if(active&&!lock.current)setStatus(false);});
    return () => {active=false;};
  }, [user?.id, user?.role, upload, setStatus]);
  useEffect(() => () => { if(preview) URL.revokeObjectURL(preview); }, [preview]);
  const clear = async () => {
    if (lock.current) return;
    lock.current=true; setStatus(true);
    showLoading('Please wait, your photo is being cleared...', 'checkout-photo');
    try {
      const current = photo ?? await orderPhotoService.current();
      if(current) await orderPhotoService.clear(current.imageId);
      if(user)clearCheckoutPhotoDraft(user.id);
      setPhoto(null); setPreview(''); latestFile.current=undefined; callbacks.current.onChange(null);
      showSuccess('Photo cleared', {id:'checkout-photo'});
    } catch {showError('Your photo could not be cleared. Please try again.', {id:'checkout-photo',retry:()=>{void clear();}});}
    finally {lock.current=false;setStatus(false);}
  };
  return <section className="rounded-xl border border-black/10 p-5" aria-labelledby="checkout-photo-title">
    <h2 id="checkout-photo-title" className="text-lg font-black">Upload your photo (optional)</h2>
    <p className="mt-2 text-sm text-black/65">Please upload the photo you'd like on your frame. You can skip this and share it with us later, and our team will contact you if needed.</p>
    <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void upload(file);}} className="mt-4 rounded-lg border border-dashed border-black/25 p-4">
      <input ref={input} aria-label="Choose your order photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void upload(file);}}/>
      {preview?<img src={preview} alt="Your selected photo, stored privately after upload" className="mb-3 h-24 w-24 rounded-lg object-contain"/>:<ImagePlus aria-hidden="true" className="mb-2 h-7 w-7"/>}
      {photo&&<p className="break-words text-sm font-bold">{photo.fileName}<span className="block text-xs text-black/60">{(photo.sizeBytes/1024/1024).toFixed(2)} MB</span></p>}
      {busy&&<p role="status" className="mt-2 flex items-center gap-2 text-sm font-bold"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true"/>Please wait… {progress}%</p>}
      <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={()=>input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:opacity-40"><Upload size={16}/>{photo?'Replace photo':'Choose photo'}</button>{(photo||preview)&&<button type="button" disabled={busy} onClick={()=>void clear()} className="min-h-11 px-3 text-sm font-bold underline">Clear</button>}</div>
    </div>
    <p className="mt-2 text-xs text-black/60">One photo per order. JPG, PNG or WebP, up to 4 MB.</p>
  </section>;
}
