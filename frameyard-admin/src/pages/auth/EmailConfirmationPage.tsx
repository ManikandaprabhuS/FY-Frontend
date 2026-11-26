import {useEffect,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {authService} from '../../services/auth.service';
import {useAuthStore} from '../../store/authStore';
import {confirmationFailure,readEmailConfirmation} from '../../utils/email-confirmation';
import {showSuccess} from '../../utils/toast';

export default function EmailConfirmationPage(){
 const navigate=useNavigate(),work=useRef<Promise<void>|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  if(!work.current){
   const search=window.location.search,hash=window.location.hash;
   // Remove credentials before any asynchronous work; never log or persist the URL.
   window.history.replaceState(window.history.state,'',window.location.pathname);
   work.current=(async()=>{
    const tokens=readEmailConfirmation(search,hash);
    const result=await authService.confirmCustomerSession(tokens);
    if(result.user.role!=='CUSTOMER')throw new Error(confirmationFailure);
    // Use the existing session key and verification path, not a second auth store.
    sessionStorage.setItem('fy_auth_token',result.accessToken);
    localStorage.removeItem('fy_auth_token');
    await useAuthStore.getState().checkAuth();
    // A startup check for an older account may have been in flight; verify the new token.
    if(useAuthStore.getState().token!==result.accessToken)await useAuthStore.getState().checkAuth();
    const state=useAuthStore.getState();
    if(state.status!=='authenticated'||state.user?.id!==result.user.id||state.user.role!=='CUSTOMER')throw new Error('Your email was verified, but the session could not be established. Please sign in.');
   })();
  }
  void work.current.then(()=>{if(active){showSuccess('Your email is verified. Welcome to FrameYaad!');navigate('/profile',{replace:true});}}).catch(()=>{if(active)setError(confirmationFailure);});
  return()=>{active=false;};
 },[navigate]);
 return <main className="grid min-h-screen place-items-center bg-surface p-4"><section className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-6 shadow-sm" aria-live="polite"><h1 className="text-xl font-bold">Email confirmation</h1><p className="mt-3 text-sm" role={error?'alert':'status'}>{error||'Please wait, confirming your email…'}</p>{error&&<Link className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-black px-4 text-sm font-bold text-white focus-visible:outline-2" to="/profile?mode=login">Go to customer sign in</Link>}</section></main>;
}
