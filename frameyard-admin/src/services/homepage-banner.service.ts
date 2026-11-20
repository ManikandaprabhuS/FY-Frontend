import api from "./api";
import type {OfferCode} from "./checkout.service";
export type BannerOffer={bannerImageUrl?:string|null;code:OfferCode;title:string;percentage:number;minOrderAmount:number|null};
export type BannerSettings={bannerImageUrl?:string|null;id:string;enabled:boolean;featuredOfferCode:BannerOffer["code"];updatedBy:{id:string;name:string}|null;updatedAt:string};
export const bannerCopy=(offer:BannerOffer)=>({
 label:offer.title.toUpperCase(),
 headline:"Flat "+offer.percentage+"% Off",
 subtext:offer.code!=="FIRST_ORDER"?"On orders above Rs. "+Number(offer.minOrderAmount).toLocaleString("en-IN"):"On your first order"
});
export const homepageBannerService={
 uploadImage:async(file:File,onProgress:(value:number)=>void)=>{
  const body=new FormData();body.append("image",file);
  return (await api.post<{data:{imageUrl:string}}>("/admin/homepage-banner/image",body,{timeout:45000,onUploadProgress:event=>onProgress(event.total?Math.round(event.loaded/event.total*100):0)})).data.data;
 },
 removeImage:async()=>(await api.delete<{data:{imageUrl:null}}>("/admin/homepage-banner/image",{timeout:20000})).data.data,
 public:async()=>(await api.get<{data:{banner:BannerOffer|null}}>("/home/banner",{timeout:15000})).data.data.banner,
 settings:async()=>(await api.get<{data:{settings:BannerSettings}}>("/offers/homepage-banner",{timeout:15000})).data.data.settings,
 update:async(input:{enabled?:boolean;featuredOfferCode?:BannerOffer["code"]})=>(await api.patch<{data:{settings:BannerSettings}}>("/offers/homepage-banner",input,{timeout:15000})).data.data.settings
};
