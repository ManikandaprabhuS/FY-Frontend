import {useEffect,useState} from "react";
import {Loader2} from "lucide-react";
import {contactMediaService,contactDetailsWarning,type ContactDetails} from "../../services/contact-media.service";
import {getApiErrorMessage} from "../../services/api";
import {showLoading,showSuccess,showError,showWarning} from "../../utils/toast";
const empty:ContactDetails={phone:"",email:"",studioName:"",address:""};
export default function ContactDetailsSettings(){
 const [values,setValues]=useState(empty),[saved,setSaved]=useState(empty),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[ready,setReady]=useState(false);
 useEffect(()=>{
  let active=true;
  const load=()=>{
   if(active)setLoading(true);
   void contactMediaService.settings().then(result=>{if(active){setValues(result.contactDetails);setSaved(result.contactDetails);setReady(true);}}).catch(error=>showError(getApiErrorMessage(error,"Unable to load Contact details."),{retry:load})).finally(()=>{if(active)setLoading(false);});
  };
  load();return()=>{active=false;};
 },[]); const dirty=JSON.stringify(values)!==JSON.stringify(saved);
 const save=async(event:React.FormEvent)=>{
  event.preventDefault();if(saving||!dirty)return;
  const normalized=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,value?.trim()||""])) as ContactDetails;
  const warning=contactDetailsWarning(normalized);if(warning){showWarning(warning,{id:"contact-details"});return;}
  setSaving(true);showLoading("Please wait, your contact details are being saved...","contact-details");
  try{const result=await contactMediaService.details(normalized);setValues(result.contactDetails);setSaved(result.contactDetails);showSuccess("Contact details updated.",{id:"contact-details"});}
  catch(error){showError(getApiErrorMessage(error,"Unable to save Contact details."),{id:"contact-details"});}
  finally{setSaving(false);}
 };
 return <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6"><h2 className="text-xl font-bold">Contact details</h2><p className="mt-2 text-sm text-on-surface-variant">These details appear publicly on Contact us. Enter verified business details; empty fields show a coming-soon note, never placeholder numbers.</p>
 <form className="mt-6 space-y-4" onSubmit={event=>{void save(event);}} noValidate>
 {([{key:"phone",label:"Public phone number",type:"tel",max:30},{key:"email",label:"Contact email",type:"email",max:254},{key:"studioName",label:"Studio name",type:"text",max:120},{key:"address",label:"Full studio address",type:"text",max:500}] as const).map(field=><label key={field.key} className="block text-sm font-bold">{field.label}<input type={field.type} value={values[field.key]??""} maxLength={field.max} disabled={loading||saving||!ready} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))} className="mt-2 block min-h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 font-normal"/></label>)}
 <button type="submit" disabled={loading||saving||!ready||!dirty} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-5 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{(loading||saving)&&<Loader2 size={17} className="animate-spin"/>}{saving?"Saving...":"Save contact details"}</button>
 </form></section>;
}
