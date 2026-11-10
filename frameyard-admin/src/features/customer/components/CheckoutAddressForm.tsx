import {useState,useRef} from "react";
import api from "../../../services/api";
import {authService} from "../../../services/auth.service";
import {useAuthStore} from "../../../store/authStore";
import {showLoading,showSuccess,showWarning,showApiError} from "../../../utils/toast";
export type DeliveryAddress={id:string;addressLine:string;city:string;state:string;country:string;postalCode:string;contactPerson:string;contactNumber:string};
export default function CheckoutAddressForm({onSaved}:{onSaved:(address:DeliveryAddress)=>void}){
 const user=useAuthStore(s=>s.user);
 const [values,setValues]=useState({contactPerson:user?.name??"",contactNumber:user?.phoneNumber??"",addressLine:user?.addressLine??"",city:user?.cityName??"",state:user?.stateName??"",country:user?.countryName??"India",postalCode:user?.postalCode??""});
 const [busy,setBusy]=useState(false);const lock=useRef(false);
 const fields=[["contactPerson","Recipient name",2,120],["contactNumber","Phone number",7,20],["addressLine","Address",5,255],["city","City",2,100],["state","State",2,100],["country","Country",2,100],["postalCode","Postal code",3,20]] as const;
 const valid=fields.every(([key,,min,max])=>values[key].trim().length>=min&&values[key].trim().length<=max&&!/[<>]/.test(values[key]))&&/^\+?[0-9\s()-]+$/.test(values.contactNumber)&&values.contactNumber.replace(/\D/g,"").length>=7&&values.contactNumber.replace(/\D/g,"").length<=15;
 const save=async()=>{
  if(lock.current)return;if(!valid){showWarning("Please enter a valid delivery address and phone number.",{id:"checkout-address"});return;}
  lock.current=true;setBusy(true);showLoading("Please wait, your address is being saved...","checkout-address");
  try{
   const response=await api.post<{data:{address:DeliveryAddress}}>("/addresses",Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value.trim()])));
   onSaved(response.data.data.address);showSuccess("Address saved successfully",{id:"checkout-address"});
   void authService.me().then(profile=>useAuthStore.setState({user:profile})).catch(()=>undefined);
  }catch(error){showApiError(error,"Address could not be saved. Please try again.",{id:"checkout-address"});}
  finally{lock.current=false;setBusy(false);}
 };
 return <section aria-label="Delivery address" className="rounded-xl border border-black/10 p-5"><h2 className="text-lg font-black">Delivery address</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map(([key,label,,max])=><label key={key} className="text-sm font-bold">{label}<input required maxLength={max} disabled={busy} autoComplete={key==="contactPerson"?"name":key==="contactNumber"?"tel":key==="postalCode"?"postal-code":undefined} value={values[key]} onChange={e=>setValues(previous=>({...previous,[key]:e.target.value}))} className="mt-1 min-h-11 w-full rounded-lg border border-black/20 bg-white px-3 font-normal"/></label>)}</div><button type="button" disabled={busy||!valid} onClick={()=>void save()} className="mt-4 min-h-11 rounded-lg bg-black px-5 font-bold text-white disabled:opacity-40">{busy?"Saving address…":"Save delivery address"}</button></section>;
}
