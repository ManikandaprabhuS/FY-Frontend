import api from "./api";
export type OfferCode="FIRST_ORDER"|"BIG_ORDER";
export type CheckoutSelection={productIdentifier:string;variantId:string;quantity:number;colorName?:string;colorHex?:string};
export type CheckoutOffer={code:OfferCode;title:string;description:string;percent:number;discountAmount:number;total:number;bestOffer:boolean;version:number};
export type CheckoutQuote={offers:CheckoutOffer[];subtotal:number;bigOrderRemovalMessage:string;addresses:Array<{id:string;addressLine:string;city:string;postalCode:string;contactPerson:string;contactNumber:string}>};
export const checkoutService={
 offers:async(items:CheckoutSelection[]) => (await api.post<{data:CheckoutQuote}>("/checkout/offers",{items},{timeout:20000})).data.data,
 place:async(items:CheckoutSelection[],userAddressId:string,couponCode?:OfferCode,couponVersion?:number) => (await api.post<{data:{order:{id:string;orderNumber:string;totalPrice:string;couponTitle?:string;discountPercent?:string;discountAmount?:string;subtotal?:string}}}>("/orders/checkout",{items,userAddressId,couponCode,couponVersion},{timeout:30000})).data.data.order,
};
