export const validateOfferInputs=(percentage:string,minimum?:string):string|null=>{
 if(!/^\d+(?:\.\d{1,2})?$/.test(percentage.trim())||!Number.isFinite(Number(percentage))||Number(percentage)<=0||Number(percentage)>100)return "Percentage must be greater than 0 and at most 100, with up to 2 decimals.";
 if(minimum!==undefined&&(!/^\d+$/.test(minimum.trim())||!Number.isSafeInteger(Number(minimum))||Number(minimum)<=0||Number(minimum)>999999999999))return "Minimum order amount must be a positive whole number.";
 return null;
};
