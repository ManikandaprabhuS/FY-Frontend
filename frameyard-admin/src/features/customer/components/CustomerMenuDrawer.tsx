import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Link,NavLink,useNavigate,useLocation} from 'react-router-dom';
import {ArrowRight,CalendarDays,ChevronRight,Heart,House,Image,Layers,MessageCircle,Package,UserRound,X} from 'lucide-react';
import fyLogoIcon from '../../../assets/fy-logo-mark.png';
import {useAuthStore} from '../../../store/authStore';
import {showWarning} from '../../../utils/toast';
import {BRAND_NAME,STUDIO_PATH} from '../navigation';
import '../styles/menu-drawer.css';

type Props={
 open:boolean;
 onClose:()=>void;
 onOpenWishlist:()=>void;
 wishlistCount:number;
 returnFocusTo:React.RefObject<HTMLButtonElement|null>;
};
const primary=[
 {name:'Home',path:'/',icon:House},
 {name:'Shop all frames',path:'/products',icon:Layers},
 {name:'Customize a frame',path:STUDIO_PATH,icon:Image},
];
const services=[
 {name:'Your orders',path:'/profile#orders',icon:Package,protected:true},
 {name:'Book appointment',path:'/book-appointment',icon:CalendarDays},
 {name:'Contact us',path:'/contact-us',icon:MessageCircle},
];
export default function CustomerMenuDrawer({open,onClose,onOpenWishlist,wishlistCount,returnFocusTo}:Props){
 const status=useAuthStore(s=>s.status),user=useAuthStore(s=>s.user);
 const authenticated=useAuthStore(s=>s.isAuthenticated);
 const checking=status==='checking';
 const customer=!checking&&authenticated&&user?.role==='CUSTOMER';
 const fullName=user?.name?.trim()||'Your account';
 const panel=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 const navigate=useNavigate(),location=useLocation();
 useEffect(()=>{
  if(!open)return;
  // Where the page was when the menu opened; restored on close only if the menu did not navigate away.
  const trigger=returnFocusTo.current,y=Math.max(0,window.scrollY),openedOn=window.location.pathname;
  const body=document.body;
  const old={overflow:body.style.overflow,position:body.style.position,top:body.style.top,width:body.style.width};
  body.style.overflow='hidden';body.style.position='fixed';body.style.top=-y+'px';body.style.width='100%';
  const frame=requestAnimationFrame(()=>close.current?.focus({preventScroll:true}));
  const focusable=()=>Array.from(panel.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')??[]).filter(node=>node.getClientRects().length>0);
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab')return;
   const nodes=focusable(),first=nodes[0];
   if(!first){event.preventDefault();panel.current?.focus();return;}
   const index=nodes.indexOf(document.activeElement as HTMLElement);
   const next=index<0?(event.shiftKey?nodes.length-1:0):(index+(event.shiftKey?-1:1)+nodes.length)%nodes.length;
   event.preventDefault();nodes[next].focus();
  };
  const focusin=(event:FocusEvent)=>{if(!panel.current?.contains(event.target as Node))close.current?.focus({preventScroll:true});};
  const desktop=window.matchMedia('(min-width:1024px)');
  const resize=()=>{if(desktop.matches)onClose();};
  document.addEventListener('keydown',keydown);document.addEventListener('focusin',focusin);desktop.addEventListener('change',resize);
  return()=>{
   cancelAnimationFrame(frame);document.removeEventListener('keydown',keydown);document.removeEventListener('focusin',focusin);desktop.removeEventListener('change',resize);
   Object.assign(body.style,old);if(window.location.pathname===openedOn)window.scrollTo(0,y);(trigger?.isConnected?trigger:document.querySelector<HTMLButtonElement>('button[aria-label="Open menu"]'))?.focus({preventScroll:true});
  };
 },[open,onClose,returnFocusTo]);
 const protectedLink=(event:React.MouseEvent,destination:string)=>{
  if(checking){event.preventDefault();return;}
  if(customer){onClose();return;}
  event.preventDefault();onClose();
  showWarning('Please login / create an account to continue',{id:'mobile-menu-login'});
  navigate('/profile',{state:{returnTo:destination}});
 };
 const wishlist=()=>{
  if(checking)return;
  if(!customer){
   onClose();showWarning('Please login / create an account to continue',{id:'mobile-menu-login'});
   navigate('/profile',{state:{returnTo:'/profile#wishlist'}});return;
  }
  onClose();onOpenWishlist();
 };
 return createPortal(
  <div className="fy-mobile-menu" data-open={open} aria-hidden={!open} inert={!open}>
   <button className="fy-mobile-menu__backdrop" type="button" aria-label="Close navigation drawer" onClick={onClose} tabIndex={-1}/>
   <aside ref={panel} className="fy-mobile-menu__panel" role="dialog" aria-modal="true" aria-label="Mobile navigation" tabIndex={-1}>
    <header className="fy-mobile-menu__header">
     <Link to="/" onClick={onClose} className="fy-mobile-menu__brand" aria-label="FrameYaad home"><img src={fyLogoIcon} alt=""/><span>{BRAND_NAME}</span></Link>
     <button ref={close} type="button" className="fy-mobile-menu__close" aria-label="Close menu" onClick={onClose}><X aria-hidden="true"/></button>
    </header>
    <div className="fy-mobile-menu__scroll">
     {checking?<div className="fy-mobile-menu__skeleton" role="status" aria-label="Checking account"><span/><span/></div>:customer?
      <Link to="/profile" onClick={onClose} className="fy-mobile-menu__account">
       <span className="fy-mobile-menu__avatar" aria-hidden="true">{Array.from(fullName)[0]?.toUpperCase()}</span>
       <span className="fy-mobile-menu__identity"><small>Hello,</small><strong title={fullName}>{fullName}</strong></span><ChevronRight aria-hidden="true"/>
      </Link>:
      <div className="fy-mobile-menu__guest">
       <div className="fy-mobile-menu__pitch"><span className="fy-mobile-menu__picture" aria-hidden="true"><Image/></span><strong>Sign in to save frames, track orders and more.</strong></div>
       <div className="fy-mobile-menu__benefits">
        <span><Heart aria-hidden="true"/><span>Save<br/>favorites</span></span><span><Package aria-hidden="true"/><span>Track<br/>orders</span></span><span><CalendarDays aria-hidden="true"/><span>Book<br/>appointments</span></span>
       </div>
      </div>}
     <nav aria-label="Explore" className="fy-mobile-menu__primary">
      {primary.map(({name,path,icon:Icon})=><NavLink key={path} to={path} end={path==='/'} onClick={onClose} className={({isActive})=>'fy-mobile-menu__link'+(isActive?' is-active':'')}><Icon aria-hidden="true"/><span>{name}</span>{path!=='/'&&<ChevronRight className="fy-mobile-menu__chevron" aria-hidden="true"/>}</NavLink>)}
     </nav>
     <nav aria-label="Your account and services" className="fy-mobile-menu__secondary">
      <button type="button" onClick={wishlist} disabled={checking} className={"fy-mobile-menu__link"+(location.pathname==="/profile"&&location.hash==="#wishlist"?" is-active":"")}><Heart aria-hidden="true"/><span>Wishlist</span>{customer&&wishlistCount>0&&<span className="fy-mobile-menu__saved">{wishlistCount} saved</span>}</button>
      {services.map(({name,path,icon:Icon,protected:requiresAuth})=><NavLink key={path} to={path} aria-disabled={checking&&requiresAuth||undefined} onClick={event=>requiresAuth?protectedLink(event,path):onClose()} className={({isActive})=>'fy-mobile-menu__link'+(isActive&&(!requiresAuth||location.hash==='#orders')?' is-active':'')}><Icon aria-hidden="true"/><span>{name}</span></NavLink>)}
     </nav>
    </div>
    <footer className="fy-mobile-menu__footer">
     {checking?<div className="fy-mobile-menu__footer-skeleton" aria-hidden="true"/>:<Link to="/profile" onClick={onClose} className="fy-mobile-menu__cta"><UserRound aria-hidden="true"/><span>{customer?'Your account':'Sign in or create account'}</span>{customer&&<ArrowRight aria-hidden="true"/>}</Link>}
    </footer>
   </aside>
  </div>,document.body);
}
