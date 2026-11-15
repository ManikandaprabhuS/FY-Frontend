import {useState} from "react";
import {Image as ImageIcon} from "lucide-react";
import {CONTACT_DEFAULT_BANNER as defaultImage} from "../data/contactDefaults";
import "../styles/contact.css";
export default function ContactFramingBanner({imageUrl,preview=false}:{imageUrl?:string|null;preview?:boolean}){
 const [failed,setFailed]=useState<string[]>([]);
 const src=imageUrl&&!failed.includes(imageUrl)?imageUrl:!failed.includes(defaultImage)?defaultImage:undefined;
 const Heading=preview?"h3":"h2";
 return <section className={"fy-contact-banner"+(preview?" fy-contact-banner--preview":"")} aria-label="Custom Framing">
  {src&&<img src={src} alt="Custom framing at FrameYaad" width={1600} height={600} loading="lazy" decoding="async" onError={()=>setFailed(previous=>[...previous,src])}/>}
  <div className="fy-contact-banner__copy"><ImageIcon aria-hidden="true"/><Heading>Custom Framing</Heading><p>Frames tailored to your photos, spaces and style.</p></div>
 </section>;
}
