import {useEffect,useRef,useState} from "react";
import {ArrowRight,Mail,MapPin,Phone,Play,Pause,Volume2,VolumeX} from "lucide-react";
import {contactMediaService,type ContactContent} from "../../../services/contact-media.service";
import {siteMediaService} from "../../../services/site-media.service";
import {showWarning} from "../../../utils/toast";
import ContactFramingBanner from "../components/ContactFramingBanner";
import {CONTACT_DEFAULT_POSTER} from "../data/contactDefaults";
import {prefersReducedMotion} from "../animationConfig";
import "../styles/contact.css";
const empty:ContactContent={videoUrl:null,posterUrl:null,bannerImageUrl:null,defaultVideoUrl:null,contactDetails:{phone:null,email:null,studioName:null,address:null}};
export default function ContactUsPage(){
 const [content,setContent]=useState<ContactContent>(empty);
 const [failedVideos,setFailedVideos]=useState<string[]>([]),[failedPosters,setFailedPosters]=useState<string[]>([]);
 const [playing,setPlaying]=useState(false),[hasPlayed,setHasPlayed]=useState(false),[muted,setMuted]=useState(true);
 const player=useRef<HTMLVideoElement>(null),cards=useRef<HTMLElement>(null);
 useEffect(()=>{
  let active=true;
  void contactMediaService.public().then(value=>{if(active)setContent(value);}).catch(()=>{
   // Reuse Home's existing source, without changing or duplicating Home media.
   void siteMediaService.getHeroVideo().then(video=>{if(active)setContent({...empty,defaultVideoUrl:video?.url??null});}).catch(()=>{});
  });
  return()=>{active=false;};
 },[]);
 const src=[content.videoUrl,content.defaultVideoUrl].find(value=>value&&!failedVideos.includes(value))??undefined;
 const poster=[content.posterUrl,CONTACT_DEFAULT_POSTER].find(value=>value&&!failedPosters.includes(value))??undefined;
 useEffect(()=>{
  const video=player.current;if(!video)return;
  const pause=()=>{if(document.hidden)video.pause();};
  const observer=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(([entry])=>{if(!entry?.isIntersecting)video.pause();},{threshold:.1}):null;
  observer?.observe(video);document.addEventListener("visibilitychange",pause);
  return()=>{observer?.disconnect();document.removeEventListener("visibilitychange",pause);video.pause();};
 },[src]);
 const play=()=>{
  const video=player.current;if(!video)return;video.muted=muted;
  void video.play().catch(()=>showWarning("The video could not play. Please try again.",{id:"contact-video-play"}));
 };
 const scrollToCards=()=>{
  const node=cards.current;if(!node)return;
  const header=document.querySelector<HTMLElement>('.fy-customer-header');
  const offset=Math.max(84,(header?.getBoundingClientRect().height??60)+16);
  const maximum=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const top=Math.min(maximum,Math.max(0,node.getBoundingClientRect().top+window.scrollY-offset));
  window.scrollTo({top,behavior:prefersReducedMotion()?"auto":"smooth"});
 };
 const details=content.contactDetails;
 return <div className="fy-contact">
  <section className="fy-contact-hero" aria-labelledby="contact-title">
   <div className="fy-contact-hero__media">
    {src&&<video key={src} ref={player} src={src} poster={poster} playsInline muted={muted} controls={hasPlayed&&!playing} preload="metadata" onPlay={()=>{setPlaying(true);setHasPlayed(true);}} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onError={()=>{setFailedVideos(previous=>[...previous,src]);setPlaying(false);setHasPlayed(false);}} aria-label="The FrameYaad story"/>}
    {!hasPlayed&&poster&&<img src={poster} alt="A living space filled with framed memories" className="fy-contact-hero__poster" width={1600} height={900} decoding="async" onError={()=>setFailedPosters(previous=>[...previous,poster])}/>}
    {src&&<button type="button" className="fy-contact-hero__mute" aria-label={muted?"Unmute story video":"Mute story video"} onClick={()=>setMuted(value=>!value)}>{muted?<VolumeX aria-hidden="true"/>:<Volume2 aria-hidden="true"/>}</button>}
    {playing&&<button type="button" className="fy-contact-hero__pause" aria-label="Pause FrameYaad story" onClick={()=>player.current?.pause()}><Pause aria-hidden="true"/></button>}
    {!playing&&src&&<button type="button" className="fy-contact-hero__play" aria-label="Play FrameYaad story" onClick={play}><Play aria-hidden="true" fill="currentColor"/></button>}
    <svg className="fy-contact-hero__curve" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40Q190 -20 420 30T760 56T1100 30T1440 48V80H0Z" fill="white"/></svg>
   </div>
   <div className="fy-contact-hero__copy"><p className="fy-contact-label">WHO WE ARE</p><h1 id="contact-title">Let’s frame something meaningful.</h1><p>We are FrameYaad — a passionate team that designs and creates premium, custom frames to preserve your special moments, art and memories.</p><a className="fy-contact-hero__cta" href="#contact-cards" onClick={event=>{event.preventDefault();scrollToCards();}}>Get in touch <ArrowRight aria-hidden="true"/></a></div>
  </section>
  <section ref={cards} id="contact-cards" className="fy-contact-cards" aria-label="Get in touch">
   <div className="fy-contact-cards__intro"><p className="fy-contact-label">GET IN TOUCH</p><h2>We’d love to hear from you.</h2><p>Reach out to us for orders, custom framing requests, collaborations, or any other queries.</p></div>
   <article className="fy-contact-card"><Phone aria-hidden="true"/><div><h2>Call us</h2><p>Speak with our frame experts for any assistance.</p>{details.phone?<a className="fy-contact-pill" href={"tel:"+details.phone.replace(/[^+0-9]/g,"")}><span>{details.phone}</span></a>:<p className="fy-contact-card__pending">Phone details coming soon.</p>}</div></article>
   <article className="fy-contact-card"><Mail aria-hidden="true"/><div><h2>Email us</h2><p>Drop us an email and we’ll get back to you shortly.</p>{details.email?<a className="fy-contact-pill" href={"mailto:"+encodeURIComponent(details.email).replace("%40","@")}><span>{details.email}</span></a>:<p className="fy-contact-card__pending">Email details coming soon.</p>}</div></article>
   <article className="fy-contact-card"><MapPin aria-hidden="true"/><div><h2>Visit our studio</h2><p>Explore our frame collections and customization options.</p>{details.studioName||details.address?<address className="fy-contact-pill"><span>{[details.studioName,details.address].filter(Boolean).join(" · ")}</span></address>:<p className="fy-contact-card__pending">Studio details coming soon.</p>}</div></article>
  </section>
  <div className="fy-contact-banner-wrap"><ContactFramingBanner imageUrl={content.bannerImageUrl}/></div>
 </div>;
}
