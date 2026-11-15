import React,{useCallback,useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter,useLocation,useNavigate} from "react-router-dom";
import {Toaster} from "react-hot-toast";
import CustomerMenuDrawer from "../../src/features/customer/components/CustomerMenuDrawer";
import {useAuthStore} from "../../src/store/authStore";
import {useCustomerCommerceStore} from "../../src/store/customerCommerceStore";
import {safeAuthReturnPath} from "../../src/utils/auth-return-path";
import type {User} from "../../src/types";
import "../../src/index.css";
const params=new URLSearchParams(location.search),name=params.get("name")||"Manikandasprabhu";
const user={id:"drawer-test",name,email:"test@example.invalid",role:"CUSTOMER"} as User;
const setAuth=(status:string)=>useAuthStore.setState({status:status as "checking"|"authenticated"|"unauthenticated",isAuthenticated:status==="authenticated",user:status==="authenticated"?user:null,loading:status==="checking"});
setAuth(params.get("auth")||"unauthenticated");
useCustomerCommerceStore.setState({cartOwnerId:user.id,wishlistTotal:Number(params.get("count")||0)});
function Fixture(){
 const [open,setOpen]=useState(false),[wishlist,setWishlist]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null),navigate=useNavigate(),location=useLocation();
 const count=useCustomerCommerceStore(s=>s.wishlistTotal);
 const close=useCallback(()=>setOpen(false),[]);
 useEffect(()=>{
  const change=(event:Event)=>setAuth((event as CustomEvent<string>).detail);
  window.addEventListener("drawer-fixture-auth",change);
  return()=>window.removeEventListener("drawer-fixture-auth",change);
 },[]);
 return <><main style={{minHeight:1800,padding:20}}><button ref={trigger} onClick={()=>setOpen(true)} style={{minHeight:44}}>Open menu</button><output data-testid="destination">{location.pathname+location.hash}</output>
 {location.pathname==="/profile"&&<button onClick={()=>{setAuth("authenticated");navigate(safeAuthReturnPath((location.state as {returnTo?:string})?.returnTo,"customer"),{replace:true});}}>Complete test sign in</button>}</main>
 <CustomerMenuDrawer open={open} onClose={close} onOpenWishlist={()=>setWishlist(true)} wishlistCount={count} returnFocusTo={trigger}/>
 {wishlist&&<section role="dialog" aria-label="Wishlist popup"><button onClick={()=>setWishlist(false)}>Close wishlist</button></section>}<Toaster/></>;
}
createRoot(document.getElementById("root")!).render(<MemoryRouter initialEntries={[params.get("route")||"/"]}><Fixture/></MemoryRouter>);
