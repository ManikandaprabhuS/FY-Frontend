import {DEFAULT_PHOTO_MAX_MB,MIN_PHOTO_MAX_MB,MAX_PHOTO_MAX_MB,photoLimitValidation} from "../../utils/photo-limits";
import {showWarning} from "../../utils/toast";
export default function VariantPhotoLimitInput({value,onChange}:{value:string;onChange:(value:string)=>void}){
 return <label className="col-span-2 block text-xs font-bold text-on-surface-variant">Max photo upload size (MB)
 <input type="number" min={MIN_PHOTO_MAX_MB} max={MAX_PHOTO_MAX_MB} step="0.1" value={value} onChange={e=>onChange(e.target.value)} onBlur={()=>{const issue=photoLimitValidation(value.trim()===""?null:Number(value));if(issue)showWarning(issue,{id:"variant-photo-limit"});}} placeholder={"Default: "+DEFAULT_PHOTO_MAX_MB+" MB"} className="mt-2 w-full rounded-lg border border-outline-variant p-2.5 text-sm font-normal"/>
 <span className="mt-1 block text-xs font-normal normal-case">Customers can upload a photo up to this size for this variant. Leave empty for the default ({DEFAULT_PHOTO_MAX_MB} MB).</span>
 </label>;
}
