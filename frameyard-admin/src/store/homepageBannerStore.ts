import {create} from "zustand";
import {useAuthStore} from "./authStore";
import {type BannerOffer} from "../services/homepage-banner.service";
import api from "../services/api";

const KEY="fy_home_banner_v1";
const valid=(value:unknown):value is BannerOffer|null=>{
 if(value===null)return true;
 if(!value||typeof value!=="object")return false;
 const v=value as Partial<BannerOffer>;
 return (v.code==="FIRST_ORDER"||v.code==="BIG_ORDER")&&typeof v.title==="string"&&typeof v.percentage==="number"&&Number.isFinite(v.percentage)&&v.percentage>0&&v.percentage<=100;
};
const read=():BannerOffer|null|undefined=>{
 try{
  const value=JSON.parse(sessionStorage.getItem(KEY)??"null") as {at?:number;banner?:unknown}|null;
  return value&&typeof value.at==="number"&&Date.now()-value.at<86400000&&valid(value.banner)?value.banner:undefined;
 }catch{return undefined;}
};
export const useHomepageBannerStore=create<{banner:BannerOffer|null|undefined}>(()=>({banner:read()}));
let started=false,epoch=0,owner="guest";
const preload=(banner:BannerOffer|null)=>{
 if(!banner?.bannerImageUrl)return;
 const url=banner.bannerImageUrl;
 if(Array.from(document.querySelectorAll<HTMLLinkElement>('link[data-home-banner]')).some(link=>link.href===url))return;
 const link=document.createElement("link");link.rel="preload";link.as="image";link.href=url;link.fetchPriority="high";link.dataset.homeBanner="true";document.head.append(link);
};
const refresh=async()=>{
 const generation=++epoch;
 for(let attempt=0;attempt<2;attempt++){
  try{
   let banner:BannerOffer|null;
   {
    const response=await fetch(api.getUri({url:"/home/banner/public"}),{credentials:"omit",signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error("Banner unavailable");
    const payload=await response.json() as {data?:{banner?:unknown}};
    if(!valid(payload.data?.banner))throw new Error("Invalid banner response");
    banner=payload.data!.banner as BannerOffer|null;
   }
   if(generation!==epoch)return;
   useHomepageBannerStore.setState({banner});preload(banner);
   // Only public content is shared across identities in session storage.
   try{sessionStorage.setItem(KEY,JSON.stringify({at:Date.now(),banner}));}catch{/* Storage may be disabled. */}
   return;
  }catch{
   if(generation!==epoch)return;
   if(attempt===0)await new Promise(resolve=>setTimeout(resolve,1000));
   // Keep the previous successful response on network/server failures.
  }
 }
};
export const startHomepageBanner=()=>{
 if(started)return;started=true;
 preload(useHomepageBannerStore.getState().banner??null);
 const sync=()=>{
  const auth=useAuthStore.getState();
  if(auth.status==="checking")return;
  const next=auth.status==="authenticated"?auth.user?.id??"guest":"guest";
  if(next===owner)return;
  owner=next;void refresh();
 };
 // Start the public request before React renders the hero or auth resolves.
 void refresh();
 useAuthStore.subscribe(sync);sync();
};
