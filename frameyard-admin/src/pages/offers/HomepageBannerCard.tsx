import {useEffect,useRef,useState} from "react";
import {homepageBannerService,type BannerSettings,type BannerOffer} from "../../services/homepage-banner.service";
import {type AdminOffer} from "../../services/offers.service";
import {showApiError,showLoading,showSuccess,showWarning} from "../../utils/toast";
import BannerImageUpload from "./BannerImageUpload";
export default function HomepageBannerCard({offers}:{offers:AdminOffer[]}){
 const [settings,setSettings]=useState<BannerSettings>(),[code,setCode]=useState<BannerOffer["code"]>("BIG_ORDER"),[busy,setBusy]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const lock=useRef(false);
 const [imageBusy,setImageBusy]=useState(false);
 useEffect(()=>{let active=true;void homepageBannerService.settings().then(value=>{if(active){setSettings(value);setCode(value.featuredOfferCode);setError(false);}}).catch(e=>{if(active){setError(true);showApiError(e,"Homepage banner settings could not be loaded.",{id:"banner-settings"});}});return()=>{active=false;};},[revision]);
 const update=async(toggle:boolean)=>{
  if(lock.current||imageBusy||!settings)return;lock.current=true;setBusy(true);
  const previous=settings,next=!settings.enabled,id="banner-update";
  if(toggle){setSettings({...settings,enabled:next});if(next)showSuccess("Banner is now visible on the Home page",{id});else showWarning("Banner hidden",{id});}
  else showLoading("Please wait, your banner is being updated...",id);
  try{
   const value=await homepageBannerService.update(toggle?{enabled:next}:{featuredOfferCode:code});setSettings(value);
   if(!toggle){setCode(value.featuredOfferCode);showSuccess("Homepage banner updated successfully",{id});}
  }catch(e){if(toggle)setSettings(previous);showApiError(e,"Your banner could not be updated. Please try again.",{id});}
  finally{lock.current=false;setBusy(false);}
 };
 const offer=offers.find(value=>value.code===code);
 return <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold">Homepage banner</h2>
 {!settings?error?<button type="button" onClick={()=>setRevision(v=>v+1)} className="mt-4 min-h-11 rounded-lg border px-4 font-bold">Retry banner settings</button>:<div role="status" className="mt-4 h-32 animate-pulse rounded-lg bg-black/5"/>:<>
 <label className="mt-4 flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" role="switch" aria-checked={settings.enabled} checked={settings.enabled} disabled={busy||imageBusy} onChange={()=>void update(true)} className="h-5 w-5 accent-black"/>Show banner on Home page</label>
 <div className="mt-4 flex flex-wrap items-end gap-3"><label className="flex-1 text-sm font-bold">Featured offer<select aria-label="Featured homepage offer" disabled={busy} value={code} onChange={e=>setCode(e.target.value as BannerOffer["code"])} className="mt-2 min-h-11 w-full rounded-lg border border-outline-variant bg-white px-3 text-black"><option value="BIG_ORDER">Big Order</option><option value="FIRST_ORDER">First Order</option></select></label><button type="button" disabled={busy||imageBusy||code===settings.featuredOfferCode} onClick={()=>void update(false)} className="min-h-11 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:opacity-40">Save banner</button></div>
 <p className="mt-4 text-xs text-secondary">Last updated by {settings.updatedBy?.name??"System"} on {new Date(settings.updatedAt).toLocaleString("en-IN")}</p>
 <BannerImageUpload imageUrl={settings.bannerImageUrl} offer={offer} disabled={busy} onBusy={setImageBusy} onUpdated={url=>{
  setSettings(previous=>previous?{...previous,bannerImageUrl:url}:previous);
  void homepageBannerService.settings().then(setSettings).catch(()=>showWarning("Image saved. Refresh the page to update the banner details.",{id:"banner-image-details"}));
 }}/>
 {(!settings.enabled||!offer?.enabled)&&<p className="mt-3 text-sm font-semibold text-amber-800">{!settings.enabled?"The homepage banner is hidden.":"The selected offer is inactive, so customers will not see this banner."}</p>}
 </>}
 </article>;
}
