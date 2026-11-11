import {useEffect,useState} from "react";
import {useAuthStore} from "../../../store/authStore";
import {homepageBannerService,type BannerOffer} from "../../../services/homepage-banner.service";
import HomepageBannerVisual from "./HomepageBannerVisual";
export default function HomepageOfferBanner(){
 const status=useAuthStore(s=>s.status),userId=useAuthStore(s=>s.user?.id);
 const owner=status==="authenticated"?userId??"guest":"guest";
 const [result,setResult]=useState<{owner:string;banner:BannerOffer|null}>();
 useEffect(()=>{
  if(status==="checking")return;
  let active=true,inFlight=false;
  const refresh=async()=>{
   if(document.hidden||inFlight)return;inFlight=true;
   try{const banner=await homepageBannerService.public();if(active)setResult({owner,banner});}
   catch{if(active)setResult({owner,banner:null});}
   finally{inFlight=false;}
  };
  void refresh();const timer=setInterval(()=>void refresh(),30000);
  window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
  return()=>{active=false;clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
 },[status,owner]);
 if(status==="checking"||result?.owner!==owner)return <div className="fy-offer-wrap" role="status" aria-label="Loading homepage offer"><div className="fy-offer-skeleton"/></div>;
 if(!result.banner)return null;
 return <div className="fy-offer-wrap"><HomepageBannerVisual offer={result.banner}/></div>;
}
