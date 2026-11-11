import {useId} from "react";
import {Link} from "react-router-dom";
import {ArrowRight} from "lucide-react";
import {bannerCopy,type BannerOffer} from "../../../services/homepage-banner.service";
import "../styles/homepage-banner.css";
export default function HomepageBannerVisual({offer,preview=false}:{offer:BannerOffer;preview?:boolean}){
 const id=useId().replace(/:/g,""),copy=bannerCopy(offer),Heading=preview?"h3":"h2";
 return <section className="fy-offer-banner" aria-labelledby={id+"-title"}>
 <div className="fy-offer-banner__copy"><p className="fy-offer-banner__label">LIMITED TIME OFFER</p><Heading id={id+"-title"} className="fy-offer-banner__heading">{copy.headline}</Heading><p className="fy-offer-banner__subtext">{copy.subtext}</p><Link to="/products" aria-label="Shop all frames" className="fy-offer-banner__shop">Shop Now<ArrowRight size={16} aria-hidden="true"/></Link></div>
 <svg className="fy-offer-banner__art" viewBox="0 0 600 260" aria-hidden="true" focusable="false">
 <defs>{[["black","#333333","#090909"],["silver","#b4b4b1","#595b59"],["wood","#ba7741","#65351e"],["red","#b43a2c","#6d1e17"]].map(([name,start,end])=><linearGradient key={name} id={id+name} x1="0" y1="0" x2="1" y2="1"><stop stopColor={start}/><stop offset="1" stopColor={end}/></linearGradient>)}</defs>
 {[["black",0],["silver",135],["wood",270],["red",405]].map(([finish,x])=><g key={finish} transform={"translate("+x+",-20) rotate(36 130 130)"}><path d="M35 -25H235V22H82V245H35Z" fill={"url(#"+id+finish+")"} stroke="#111" strokeOpacity=".15"/><path d="M47 -25V231M82 22H235" fill="none" stroke="white" strokeOpacity=".22" strokeWidth="2"/><path d="M35 -25L82 22" stroke="#111" strokeOpacity=".25"/></g>)}
 </svg></section>;
}
