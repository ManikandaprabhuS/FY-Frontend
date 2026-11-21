import {useState} from "react";
import {Image as ImageIcon} from "lucide-react";
import {CONTACT_DEFAULT_BANNER as defaultImage} from "../data/contactDefaults";
import "../styles/contact.css";
export default function ContactFramingBanner({imageUrl,preview=false,home=false,eager=false,onUnavailable}:{imageUrl?:string|null;preview?:boolean;home?:boolean;eager?:boolean;onUnavailable?:()=>void}){
 const [failed,setFailed]=useState<string[]>([]);
 const src=imageUrl&&!failed.includes(imageUrl)?imageUrl:!failed.includes(defaultImage)?defaultImage:undefined;
 const Heading=preview?"h3":"h2";
 return <section className={"fy-contact-banner"+(preview?" fy-contact-banner--preview":"")} aria-label="Custom Framing">
  {src&&<img src={src} alt="Custom framing at FrameYaad" width={1600} height={600} loading={eager?"eager":"lazy"} decoding="async" onError={()=>{setFailed(previous=>[...previous,src]);if(src===defaultImage)onUnavailable?.();}}/>}
  <div className="fy-contact-banner__copy"><ImageIcon aria-hidden="true"/><Heading>{home?"Bulk orders? Talk to us":"Custom Framing"}</Heading><p>{home?"Custom frames and bulk bookings. Call or message our team.":"Frames tailored to your photos, spaces and style."}</p>{home&&<span className="fy-banner-slider__contact-cta">Get in touch <span aria-hidden="true">→</span></span>}</div>
 </section>;
}
