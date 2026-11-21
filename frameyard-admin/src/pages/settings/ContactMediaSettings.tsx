import {useEffect,useRef,useState} from "react";
import {Loader2,Trash2,Upload} from "lucide-react";
import {contactMediaService,contactFileWarning,CONTACT_IMAGE_MAX,type ContactSettings,type ContactMediaKind} from "../../services/contact-media.service";
import {bannerImageRecommendation} from "../offers/banner-image-validation";
import {showError,showLoading,showSuccess,showWarning} from "../../utils/toast";
import {getApiErrorMessage} from "../../services/api";
import ContactFramingBanner from "../../features/customer/components/ContactFramingBanner";
import {CONTACT_DEFAULT_POSTER} from "../../features/customer/data/contactDefaults";
const label:Record<ContactMediaKind,string>={video:"Storyboard video",poster:"Poster image (optional)",banner:"Custom Framing banner image"};
export default function ContactMediaSettings(){
 const [settings,setSettings]=useState<ContactSettings|null>(null),[loading,setLoading]=useState(true);
 const [active,setActive]=useState<ContactMediaKind|null>(null),[progress,setProgress]=useState(0);
 const [bannerPreview,setBannerPreview]=useState<string|null>(null);
 useEffect(()=>()=>{if(bannerPreview)URL.revokeObjectURL(bannerPreview);},[bannerPreview]);
 const lock=useRef(false);
 useEffect(()=>{
  const load=()=>contactMediaService.settings().then(setSettings).catch(error=>showError(getApiErrorMessage(error,"Unable to load Contact media."),{retry:()=>{void load();}})).finally(()=>setLoading(false));
  void load();
 },[]); const upload=async(kind:ContactMediaKind,file:File)=>{
  if(lock.current)return;
  const warning=contactFileWarning(kind,file);if(warning){showWarning(warning,{id:"contact-media-validation"});return;}
  if(kind==="banner")setBannerPreview(URL.createObjectURL(file));
  lock.current=true;setActive(kind);setProgress(0);
  const id="contact-media-"+kind;
  try{
   if(kind!=="video"){
    const url=URL.createObjectURL(file);
    try{
     const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>reject(new Error("This image could not be opened."));image.src=url;});
     if(kind==="banner"&&dimensions.width<1000)showWarning("This image is narrower than 1000 px. It can still be uploaded.",{id:"contact-banner-resolution"});
     else if(kind==="banner"&&(dimensions.width/dimensions.height<2||dimensions.width/dimensions.height>4.5))showWarning("This image has a very different ratio from the banner and will be cropped. It can still be uploaded.",{id:"contact-banner-resolution"});
    }finally{URL.revokeObjectURL(url);}
   }
   showLoading(kind==="video"?"Please wait, your video is being uploaded...":"Please wait, your image is being uploaded...",id);
   setSettings(await contactMediaService.upload(kind,file,setProgress));
   if(kind==="banner")setBannerPreview(null);
   showSuccess(label[kind]+" updated.",{id});
  }catch(error){showError(getApiErrorMessage(error,"Upload failed. Please try again."),{id,retry:()=>{void upload(kind,file);}});}
  finally{lock.current=false;setActive(null);setProgress(0);}
 };
 const remove=async(kind:ContactMediaKind)=>{
  if(lock.current||!window.confirm("Remove "+label[kind].toLowerCase()+"? The default will be used."))return;
  lock.current=true;setActive(kind);const id="contact-media-"+kind;showLoading("Please wait, your media is being removed...",id);
  try{setSettings(await contactMediaService.remove(kind));if(kind==="banner")setBannerPreview(null);showSuccess("Media removed. The default will be used.",{id});}
  catch(error){showError(getApiErrorMessage(error,"Unable to remove this media."),{id,retry:()=>{void remove(kind);}});}
  finally{lock.current=false;setActive(null);}
 };
 const busy=loading||active!==null;
 if(loading)return <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6" role="status"><Loader2 className="inline h-5 w-5 animate-spin"/> Loading Contact media...</div>;
 return <div className="space-y-6">
  <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
   <h2 className="text-xl font-bold">Storyboard video</h2><p className="mt-2 text-sm text-on-surface-variant">Contact uses the Home video by default. Changes here do not change Home. Uploads are saved automatically.</p>
   <div className="mt-5 aspect-video overflow-hidden rounded-xl bg-black/5">
    {settings?.video?.url||settings?.defaultVideoUrl?<video key={settings.video?.url??settings.defaultVideoUrl} src={settings.video?.url??settings.defaultVideoUrl??undefined} poster={settings.poster?.url??CONTACT_DEFAULT_POSTER} controls muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={settings?.poster?.url??CONTACT_DEFAULT_POSTER} alt="Default story poster" className="h-full w-full object-cover"/>}
   </div>
   <UploadControls kind="video" asset={settings?.video} disabled={busy} progress={active==="video"?progress:null} onUpload={file=>{void upload("video",file);}} onRemove={()=>{void remove("video");}}/>
   <p className="mt-3 text-xs text-on-surface-variant">MP4 or WebM, up to 50 MB, recommended 1080p, under 30 seconds.</p>
   <div className="mt-6 border-t border-outline-variant pt-4"><h3 className="font-bold">Poster image (optional)</h3><UploadControls kind="poster" asset={settings?.poster} disabled={busy} progress={active==="poster"?progress:null} onUpload={file=>{void upload("poster",file);}} onRemove={()=>{void remove("poster");}}/><p className="mt-2 text-xs">JPG, PNG or WebP, up to 2 MB. Used before playback.</p></div>
  </section>
  <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
   <h2 className="text-xl font-bold">Custom Framing banner image</h2><p className="mt-2 text-sm text-on-surface-variant">Preview uses the same responsive crop and aspect ratio as the Contact banner.</p>
   <div className="mt-5"><ContactFramingBanner imageUrl={bannerPreview??settings?.banner?.url} preview/></div>
   <UploadControls kind="banner" asset={settings?.banner} disabled={busy} progress={active==="banner"?progress:null} onUpload={file=>{void upload("banner",file);}} onRemove={()=>{void remove("banner");}}/>
   <p className="mt-3 text-xs text-on-surface-variant">{bannerImageRecommendation(CONTACT_IMAGE_MAX)}</p>
  </section>
 </div>;
}
function UploadControls({kind,asset,disabled,progress,onUpload,onRemove}:{kind:ContactMediaKind;asset?:{fileName:string;sizeBytes:number}|null;disabled:boolean;progress:number|null;onUpload:(file:File)=>void;onRemove:()=>void}){
 const size=asset?(asset.sizeBytes<1024?asset.sizeBytes+" bytes":asset.sizeBytes<1048576?(asset.sizeBytes/1024).toFixed(1)+" KB":(asset.sizeBytes/1048576).toFixed(2)+" MB"):"";
 return <div className="mt-4">
  <p className="break-words text-xs text-on-surface-variant">{asset?asset.fileName+" · "+size:"Using the default"}</p>
  <div className={"mt-3 rounded-xl border border-dashed border-outline-variant p-4 "+(disabled?"opacity-60":"")} onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(!disabled&&event.dataTransfer.files[0])onUpload(event.dataTransfer.files[0]);}}>
   <div className="flex flex-wrap items-center gap-3">
    <label className="relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-bold text-white focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"><Upload size={17} aria-hidden="true"/>{asset?"Replace":"Upload"}<input type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={"Upload "+label[kind].toLowerCase()} disabled={disabled} accept={kind==="video"?"video/mp4,video/webm":"image/jpeg,image/png,image/webp"} onChange={event=>{const file=event.target.files?.[0];event.target.value="";if(file)onUpload(file);}}/></label>
    <span className="text-xs text-on-surface-variant">or drag and drop here</span>
    {asset&&<button type="button" disabled={disabled} onClick={onRemove} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm disabled:opacity-50"><Trash2 size={16} aria-hidden="true"/>Remove</button>}
   </div>
  </div>
  {progress!==null&&<div className="mt-3" role="status" aria-live="polite"><p className="mb-1 flex items-center gap-2 text-sm font-bold"><Loader2 size={16} className="animate-spin"/>Please wait... {progress}%</p><progress className="h-2 w-full" max={100} value={progress} aria-label={label[kind]+" upload progress"}/></div>}
 </div>;
}
