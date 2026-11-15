import {useState,useRef} from "react";
import api from "../../../services/api";
import {authService} from "../../../services/auth.service";
import {useAuthStore} from "../../../store/authStore";
import {showLoading,showSuccess,showWarning,showApiError} from "../../../utils/toast";
export type DeliveryAddress={id:string;addressLine:string;city:string;state:string;country:string;postalCode:string;contactPerson:string;contactNumber:string};

type Values={contactPerson:string;contactNumber:string;addressLine:string;city:string;state:string;country:string;postalCode:string};
const fields=[["contactPerson","Full name",2,120],["contactNumber","Phone number",7,20],["addressLine","Address (house no., street, area)",5,255],["postalCode","PIN code",3,20],["city","City",2,100],["state","State",2,100],["country","Country",2,100]] as const;
const autoComplete:Record<keyof Values,string>={contactPerson:"name",contactNumber:"tel",addressLine:"street-address",postalCode:"postal-code",city:"address-level2",state:"address-level1",country:"country-name"};
const phoneOk=(value:string)=>/^\+?[0-9\s()-]+$/.test(value)&&value.replace(/\D/g,"").length>=7&&value.replace(/\D/g,"").length<=15;

/** The same rules as before, worded per field so each error can sit under its own input. */
const fieldError=(key:keyof Values,label:string,min:number,max:number,raw:string)=>{
 const value=raw.trim();
 if(!value)return label.replace(/ \(.*\)$/,"")+" is required";
 if(/[<>]/.test(value))return "Please remove < and > characters";
 if(key==="contactNumber"&&!phoneOk(value))return "Enter a valid phone number (7–15 digits)";
 if(value.length<min)return "Too short";
 if(value.length>max)return "Too long";
 return "";
};

export default function CheckoutAddressForm({onSaved,onCancel}:{onSaved:(address:DeliveryAddress)=>void;onCancel?:()=>void}){
 const user=useAuthStore(s=>s.user);
 const [values,setValues]=useState<Values>({contactPerson:user?.name??"",contactNumber:user?.phoneNumber??"",addressLine:user?.addressLine??"",city:user?.cityName??"",state:user?.stateName??"",country:user?.countryName??"India",postalCode:user?.postalCode??""});
 const [touched,setTouched]=useState<Partial<Record<keyof Values,boolean>>>({});
 const [busy,setBusy]=useState(false);const lock=useRef(false);
 const errors=Object.fromEntries(fields.map(([key,label,min,max])=>[key,fieldError(key,label,min,max,values[key])])) as Record<keyof Values,string>;
 const valid=fields.every(([key,,min,max])=>values[key].trim().length>=min&&values[key].trim().length<=max&&!/[<>]/.test(values[key]))&&phoneOk(values.contactNumber);
 const save=async()=>{
  if(lock.current)return;if(!valid){setTouched(Object.fromEntries(fields.map(([key])=>[key,true])));showWarning("Please enter a valid delivery address and phone number.",{id:"checkout-address"});return;}
  lock.current=true;setBusy(true);showLoading("Please wait, your address is being saved...","checkout-address");
  try{
   const response=await api.post<{data:{address:DeliveryAddress}}>("/addresses",Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value.trim()])));
   onSaved(response.data.data.address);showSuccess("Address saved successfully",{id:"checkout-address"});
   void authService.me().then(profile=>useAuthStore.setState({user:profile})).catch(()=>undefined);
  }catch(error){showApiError(error,"Address could not be saved. Please try again.",{id:"checkout-address"});}
  finally{lock.current=false;setBusy(false);}
 };
 return <div className="fy-co-form" aria-label="New delivery address" role="group">
  <div className="fy-co-fields">{fields.map(([key,label,,max])=>{
   const shown=touched[key]&&errors[key];
   return <div key={key} className={"fy-field fy-field--"+key} data-invalid={shown?true:undefined}>
    <label htmlFor={"addr-"+key}>{label}</label>
    <input id={"addr-"+key} required maxLength={max} disabled={busy} autoComplete={autoComplete[key]}
     inputMode={key==="contactNumber"?"tel":key==="postalCode"?"numeric":undefined} type={key==="contactNumber"?"tel":"text"}
     aria-invalid={shown?true:undefined} aria-describedby={shown?"addr-"+key+"-error":undefined}
     value={values[key]} onBlur={()=>setTouched(previous=>({...previous,[key]:true}))}
     onChange={e=>setValues(previous=>({...previous,[key]:e.target.value}))}/>
    <div className="fy-field__error-wrap"><p id={"addr-"+key+"-error"} className="fy-field__error" role={shown?"alert":undefined}>{shown||""}</p></div>
   </div>;
  })}</div>
  <div className="fy-co-form__actions">
   <button type="button" disabled={busy} onClick={()=>void save()} className="fy-co-btn fy-co-btn--solid">{busy?"Saving address…":"Save and use this address"}</button>
   {onCancel&&<button type="button" disabled={busy} onClick={onCancel} className="fy-co-btn fy-co-btn--quiet">Cancel</button>}
  </div>
 </div>;
}
