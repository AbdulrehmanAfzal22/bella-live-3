export const productionSiteOrigin='https://www.bellabyrt.com';
export function safeReturnTo(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(value))return '/account';
  let pathname;
  try{pathname=decodeURIComponent(new URL(value,productionSiteOrigin).pathname);}catch{return '/account';}
  if(pathname.startsWith('//')||/[\\\u0000-\u001f\u007f]/.test(pathname))return '/account';
  if(/^\/(?:auth|login|register|reset-password)(?:[/?#]|$)/i.test(pathname))return '/account';
  return value;
}
export function authSiteOrigin(origin){
  try{const url=new URL(origin);if(['bellabyrt.com','www.bellabyrt.com'].includes(url.hostname))return productionSiteOrigin;if(url.protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))return url.origin;}catch{}
  return productionSiteOrigin;
}
export function authCallbackUrl(origin,returnTo='/account'){
  const url=new URL('/auth/callback',authSiteOrigin(origin));url.searchParams.set('returnTo',safeReturnTo(returnTo));return url.href;
}
// Google OAuth must return to the browser that started it. Local development
// keeps its exact loopback host and port; production keeps the canonical host.
export function googleCallbackUrl(origin,returnTo='/account'){
  try{
    const url=new URL(origin);
    if(['http:','https:'].includes(url.protocol)&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&!url.username&&!url.password){
      const callback=new URL('/auth/callback',url.origin);
      callback.searchParams.set('returnTo',safeReturnTo(returnTo));
      return callback.href;
    }
  }catch{}
  return authCallbackUrl(origin,returnTo);
}
// Email links always use the canonical production host, including requests made
// from a preview or local development build. Google has its own origin handling.
export function emailConfirmationUrl(returnTo='/account'){return authCallbackUrl(productionSiteOrigin,returnTo);}
export function passwordResetUrl(){return new URL('/reset-password',productionSiteOrigin).href;}
