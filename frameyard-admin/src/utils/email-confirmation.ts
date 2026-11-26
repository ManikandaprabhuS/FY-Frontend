export const confirmationFailure='This confirmation link is invalid, expired or already used. If you already verified your email, please sign in. Otherwise request a new confirmation email.';
// The existing server-side signUp client uses Supabase's default implicit flow.
export function readEmailConfirmation(search:string,hash:string){
 const query=new URLSearchParams(search),fragment=new URLSearchParams(hash.replace(/^#/,''));
 if(query.has('error')||fragment.has('error')||query.has('error_code')||fragment.has('error_code'))throw new Error(confirmationFailure);
 if(fragment.get('type')!=='signup')throw new Error(confirmationFailure);
 const access_token=fragment.get('access_token'),refresh_token=fragment.get('refresh_token');
 if(!access_token||!refresh_token)throw new Error(confirmationFailure);
 return {access_token,refresh_token};
}
