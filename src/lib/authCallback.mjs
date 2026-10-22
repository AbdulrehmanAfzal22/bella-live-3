import {safeReturnTo} from './authRedirects.mjs';

const emailTypes=new Set(['email','signup','recovery','invite','magiclink','email_change']);
const completions=new WeakMap();
const invalidLink='This sign-in link has expired or could not be verified. Please request a new email or sign in again.';

export function readAuthRedirect(href){
  const url=new URL(href);
  const fragment=new URLSearchParams(url.hash.slice(1));
  const value=key=>fragment.get(key)||url.searchParams.get(key);
  const type=value('type');
  const code=value('code'),tokenHash=value('token_hash');
  const hasError=!!(value('error')||value('error_description')||value('error_code'));
  const hasCredentials=!!(code||tokenHash||value('access_token')||value('refresh_token'));
  return {
    shouldHandle:hasCredentials||hasError,
    hasError,code,tokenHash,type,
    destination:type==='recovery'||url.pathname==='/reset-password'?'/reset-password':safeReturnTo(url.searchParams.get('returnTo')),
  };
}

// The same one-use link may be observed by more than one React effect. Reuse
// its in-flight result instead of consuming an OTP or code a second time.
export function completeAuthRedirect(auth,link,currentUrl=()=>window.location.href){
  let links=completions.get(auth);
  if(!links){links=new WeakMap();completions.set(auth,links);}
  if(links.has(link))return links.get(link);
  const completion=(async()=>{
    if(link.hasError)throw new Error(invalidLink);
    // Supabase auto-detects implicit tokens / PKCE codes. Await initialization
    // before rendering any route guard or changing the browser URL.
    const {error:initializationError}=await auth.initialize();
    if(initializationError)throw new Error(invalidLink);
    if(link.tokenHash){
      if(!emailTypes.has(link.type))throw new Error(invalidLink);
      const {error}=await auth.verifyOtp({token_hash:link.tokenHash,type:link.type});
      if(error)throw new Error(invalidLink);
    }else if(link.code&&new URL(currentUrl()).searchParams.get('code')===link.code){
      // Only exchange a code the SDK did not already consume. This also
      // reports a missing PKCE verifier instead of accepting an older session.
      const {error}=await auth.exchangeCodeForSession(link.code);
      if(error)throw new Error(invalidLink);
    }
    const {data,error}=await auth.getSession();
    if(error||!data.session)throw new Error(invalidLink);
    const {data:userData,error:userError}=await auth.getUser();
    if(userError||!userData.user)throw new Error(invalidLink);
    return {destination:link.destination};
  })();
  links.set(link,completion);
  return completion;
}
