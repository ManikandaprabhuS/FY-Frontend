import api from "./api";
export type BannerOffer={code:"BIG_ORDER"|"FIRST_ORDER";title:string;percentage:number;minOrderAmount:number|null};
export type BannerSettings={id:string;enabled:boolean;featuredOfferCode:BannerOffer["code"];updatedBy:{id:string;name:string}|null;updatedAt:string};
export const bannerCopy=(offer:BannerOffer)=>({
 headline:(offer.code==="BIG_ORDER"?"Flat ":"")+offer.percentage+"% Off",
 subtext:offer.code==="BIG_ORDER"?"On orders above Rs. "+Number(offer.minOrderAmount).toLocaleString("en-IN"):"On your first order"
});
export const homepageBannerService={
 public:async()=>(await api.get<{data:{banner:BannerOffer|null}}>("/home/banner",{timeout:15000})).data.data.banner,
 settings:async()=>(await api.get<{data:{settings:BannerSettings}}>("/offers/homepage-banner",{timeout:15000})).data.data.settings,
 update:async(input:{enabled?:boolean;featuredOfferCode?:BannerOffer["code"]})=>(await api.patch<{data:{settings:BannerSettings}}>("/offers/homepage-banner",input,{timeout:15000})).data.data.settings
};
