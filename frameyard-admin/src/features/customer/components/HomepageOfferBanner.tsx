import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useHomepageBannerStore} from "../../../store/homepageBannerStore";
import {contactMediaService} from "../../../services/contact-media.service";
import HomepageBannerVisual from "./HomepageBannerVisual";
import ContactFramingBanner from "./ContactFramingBanner";
import "../styles/banner-slider.css";

export const BANNER_ROTATE_MS=2500;
type Slide="offer"|"contact";
export default function HomepageOfferBanner(){
 const banner=useHomepageBannerStore(s=>s.banner);
 const root=useRef<HTMLElement>(null),touch=useRef<{x:number;y:number}|null>(null);
 const [image,setImage]=useState<string|null>(null),[contactAvailable,setContactAvailable]=useState(true),[ready,setReady]=useState(false);
 const [current,setCurrent]=useState<Slide>("offer"),[revision,setRevision]=useState(0);
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[touching,setTouching]=useState(false);
 const [visible,setVisible]=useState(true),[tabVisible,setTabVisible]=useState(()=>!document.hidden),[reduced,setReduced]=useState(()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches);
 const slides:Slide[]=[...(banner?["offer" as const]:[]),...(contactAvailable?["contact" as const]:[])];
 const hasSlides=slides.length>0;
 const active=slides.includes(current)?current:slides[0],index=slides.indexOf(active);
 const paused=hovered||focused||touching||!visible||!tabVisible||reduced;
 const go=(to:number)=>{if(!slides.length)return;setCurrent(slides[(to+slides.length)%slides.length]);setRevision(v=>v+1);};
 useEffect(()=>{
  let live=true;
  const frame=requestAnimationFrame(()=>{setReady(true);void contactMediaService.public().then(value=>{if(live)setImage(value.bannerImageUrl);}).catch(()=>{/* The existing static Contact banner is the fallback. */});});
  return()=>{live=false;cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{
  const media=window.matchMedia("(prefers-reduced-motion: reduce)"),change=()=>{setReduced(media.matches);if(media.matches)setCurrent("offer");},tab=()=>setTabVisible(!document.hidden);
  media.addEventListener("change",change);document.addEventListener("visibilitychange",tab);
  return()=>{media.removeEventListener("change",change);document.removeEventListener("visibilitychange",tab);};
 },[]);
 useEffect(()=>{
  if(!ready||!root.current||!("IntersectionObserver"in window))return;
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:0});observer.observe(root.current);return()=>observer.disconnect();
 },[ready,hasSlides]);
 useEffect(()=>{
  if(!ready||paused||slides.length<2)return;
  const timer=setTimeout(()=>setCurrent(active==="offer"?"contact":"offer"),BANNER_ROTATE_MS);
  return()=>clearTimeout(timer);
 },[ready,paused,active,slides.length,revision]);
 if(!ready)return <div className="fy-offer-wrap"><div className="fy-banner-slider fy-offer-skeleton" role="status" aria-label="Loading homepage banners"/></div>;
 if(!slides.length)return null;
 return <div className="fy-offer-wrap"><section ref={root} className="fy-banner-slider" role="region" tabIndex={0} aria-roledescription="carousel" aria-label="FrameYaad offers and custom framing" data-active={active} data-paused={paused} onPointerEnter={e=>{if(e.pointerType==="mouse")setHovered(true);}} onPointerLeave={()=>{setHovered(false);setTouching(false);touch.current=null;}} onFocus={()=>setFocused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}} onKeyDown={e=>{if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();go(index+(e.key==="ArrowRight"?1:-1));}}} onPointerDown={e=>{if(e.pointerType!=="mouse"){touch.current={x:e.clientX,y:e.clientY};setTouching(true);}}} onPointerUp={e=>{const start=touch.current;touch.current=null;setTouching(false);if(start&&Math.abs(e.clientX-start.x)>40&&Math.abs(e.clientX-start.x)>Math.abs(e.clientY-start.y)*1.5)go(index+(e.clientX<start.x?1:-1));}} onPointerCancel={()=>{touch.current=null;setTouching(false);}}>
  <div className="fy-banner-slider__slides" aria-live={paused?"polite":"off"} aria-atomic="false">
   {slides.map((slide,i)=><div key={slide} className="fy-banner-slider__slide" data-active={slide===active} role="group" aria-roledescription="slide" aria-label={`${i+1} of ${slides.length}`} aria-hidden={slide!==active} inert={slide!==active}>
    {slide==="offer"&&banner?<HomepageBannerVisual offer={banner}/>:<Link className="fy-banner-slider__contact" to="/contact#get-in-touch" aria-label="Bulk orders? Get in touch with FrameYaad"><ContactFramingBanner home imageUrl={image} eager={ready} onUnavailable={()=>setContactAvailable(false)}/></Link>}
   </div>)}
  </div>
 </section></div>;
}
