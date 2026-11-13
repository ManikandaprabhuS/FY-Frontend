import {useEffect,useRef,useState} from "react";
import {Upload,LoaderCircle} from "lucide-react";
import {homepageBannerService,type BannerOffer} from "../../services/homepage-banner.service";
import {showLoading,showSuccess,showError,showWarning} from "../../utils/toast";
import HomepageBannerVisual from "../../features/customer/components/HomepageBannerVisual";
import {validateBannerFile,bannerDimensionWarning} from "./banner-image-validation";
export default function BannerImageUpload({imageUrl,offer,disabled,onBusy,onUpdated}:{imageUrl?:string|null;offer?:BannerOffer;disabled:boolean;onBusy:(busy:boolean)=>void;onUpdated:(url:string|null)=>void}){
 const [candidate,setCandidate]=useState<{url:string;name:string;size:number}>(),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0);
 const lock=useRef(false),input=useRef<HTMLInputElement>(null);
 const [savedSize,setSavedSize]=useState<number>();
 useEffect(()=>()=>{if(candidate)URL.revokeObjectURL(candidate.url);},[candidate]);
 const choose=async function chooseFile(file:File):Promise<void>{
  if(lock.current||disabled)return;
  const issue=validateBannerFile(file);if(issue){showWarning(issue,{id:"banner-image"});return;}
  lock.current=true;setBusy(true);onBusy(true);setProgress(0);
  const url=URL.createObjectURL(file);
  setCandidate({url,name:file.name,size:file.size});
  showLoading("Please wait, your banner image is being uploaded...","banner-image");
  try{
   const dimensions=await new Promise<{width:number;height:number}>((resolve,reject)=>{
    const image=new Image();const timer=setTimeout(()=>reject(new Error("Image decoding timed out")),10000);
    image.onload=()=>{clearTimeout(timer);resolve({width:image.naturalWidth,height:image.naturalHeight});};
    image.onerror=()=>{clearTimeout(timer);reject(new Error("This image could not be opened"));};image.src=url;
   });
   const warning=bannerDimensionWarning(dimensions.width,dimensions.height);
   if(warning)showWarning(warning,{id:"banner-image-dimensions"});
   const result=await homepageBannerService.uploadImage(file,setProgress);
   onUpdated(result.imageUrl);setSavedSize(file.size);setCandidate(undefined);
   showSuccess("Banner image uploaded successfully",{id:"banner-image"});
  }catch{
   showError("Your banner image could not be uploaded. Please try again.",{id:"banner-image",retry:()=>{void chooseFile(file);}});
  }finally{lock.current=false;setBusy(false);onBusy(false);}
 };
 const remove=async()=>{
  if(lock.current||disabled||(!imageUrl&&!candidate))return;
  if(!window.confirm("Remove the banner image and return to the default image?"))return;
  lock.current=true;setBusy(true);onBusy(true);
  showLoading("Please wait, your banner image is being removed...","banner-image");
  try{if(imageUrl)await homepageBannerService.removeImage();onUpdated(null);setCandidate(undefined);setSavedSize(undefined);showSuccess("Banner image removed. The default image is now used.",{id:"banner-image"});}
  catch{showError("Your banner image could not be removed. Please try again.",{id:"banner-image",retry:()=>{void remove();}});}
  finally{lock.current=false;setBusy(false);onBusy(false);}
 };
 const fileName=candidate?.name??(imageUrl?(imageUrl.split("/").pop()??"Banner image"):"Default frame artwork");
 return <section className="mt-5 border-t border-black/10 pt-5" aria-labelledby="banner-image-title">
 <h3 id="banner-image-title" className="text-sm font-bold">Banner image</h3>
 <div className="mt-3 rounded-xl border border-dashed border-black/25 p-4" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files.length!==1){showWarning("Please choose one banner image.");return;}void choose(e.dataTransfer.files[0]);}}>
 <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose banner image" className="sr-only" disabled={disabled||busy} onChange={e=>{const file=e.target.files?.[0];e.target.value="";if(file)void choose(file);}}/>
 <p className="break-words text-sm font-bold">{fileName}</p>{(candidate?.size??savedSize)!==undefined&&<p className="mt-1 text-xs text-secondary">{((candidate?.size??savedSize??0)/1024/1024).toFixed(2)} MB</p>}
 <p className="mt-2 text-xs text-secondary">Recommended size 1200 x 400 px (3:1). JPG, PNG or WebP, up to 2 MB.</p>
 <div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={disabled||busy} onClick={()=>input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:opacity-40"><Upload size={16} aria-hidden="true"/>{imageUrl?"Replace image":"Upload image"}</button><button type="button" disabled={disabled||busy||(!imageUrl&&!candidate)} onClick={()=>void remove()} className="min-h-11 rounded-lg border border-black/20 px-4 text-sm font-bold disabled:opacity-40">Remove</button></div>
 {busy&&<p role="status" className="mt-3 flex items-center gap-2 text-sm font-bold"><LoaderCircle size={16} className="animate-spin" aria-hidden="true"/>Please wait… {progress}%</p>}
 </div>
 <p className="mb-2 mt-5 text-xs font-bold">Live preview — same crop as the Home page</p>
 {offer&&<HomepageBannerVisual preview offer={{...offer,bannerImageUrl:candidate?.url??imageUrl??null}}/>}
 </section>;
}
