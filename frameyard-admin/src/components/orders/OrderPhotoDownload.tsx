import { useState } from 'react';
import { orderPhotoService } from '../../services/order-photos.service';
import { showError, showLoading, dismissToast } from '../../utils/toast';
export default function OrderPhotoDownload({order, admin=false}: {order: {id: string;photoFileName?: string|null;photoSizeBytes?: number|null};admin?:boolean}) {
 const [busy,setBusy]=useState(false);
 const download=async()=>{
  if(busy)return;setBusy(true);const id='order-photo-download:'+order.id;
  showLoading('Please wait, preparing your download...',id);
  try{await orderPhotoService.download(order.id);dismissToast(id);}
  catch{showError('Your photo could not be downloaded. Please try again.',{id,retry:()=>{void download();}});}
  finally{setBusy(false);}
 };
 return <section className="my-4 rounded-lg border border-black/10 p-4"><h3 className="text-sm font-bold">Customer photo</h3>{order.photoFileName?<><p className="mt-1 break-words text-xs">{order.photoFileName}{admin&&order.photoSizeBytes?' · '+(order.photoSizeBytes/1024/1024).toFixed(2)+' MB':''}</p><button type="button" disabled={busy} onClick={()=>void download()} className="min-h-11 py-2 text-sm font-bold underline disabled:opacity-40">{admin?'Download':'Download your photo ('+order.photoFileName+')'}</button></>:<><p className="mt-1 text-sm">No photo uploaded</p>{admin&&<p className="mt-1 text-xs text-black/60">Contact the customer directly if a photo is needed.</p>}</>}</section>;
}
