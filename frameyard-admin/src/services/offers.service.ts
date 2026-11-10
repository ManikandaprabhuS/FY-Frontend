import api from "./api";
import type {OfferCode} from "./checkout.service";
export type AdminOffer={code:OfferCode;title:string;description:string;percentage:number;minOrderAmount:number|null;enabled:boolean;version:number;updatedAt:string;updatedBy:{id:string;name:string}|null;usage:{orders:number;totalDiscount:number}};
export type OfferChange={id:string;field:string;oldValue:number|boolean;newValue:number|boolean;actorName:string;createdAt:string};
export const offersService={
 list:async()=> (await api.get<{data:{offers:AdminOffer[]}}>("/offers",{timeout:20000})).data.data.offers,
 update:async(code:OfferCode,input:{version:number;percentage?:number;minOrderAmount?:number;enabled?:boolean})=>(await api.patch<{data:{offer:AdminOffer}}>("/offers/"+code,input,{timeout:20000})).data.data.offer,
 history:async(code:OfferCode)=>(await api.get<{data:{history:OfferChange[]}}>("/offers/"+code+"/history",{timeout:20000})).data.data.history,
};
