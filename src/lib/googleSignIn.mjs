import {googleCallbackUrl} from './authRedirects.mjs';

export async function beginGoogleSignIn({auth,supabaseUrl,publishableKey,origin,returnTo,fetcher=fetch}){
  const response=await fetcher(`${supabaseUrl.replace(/\/$/,'')}/auth/v1/settings`,{headers:{apikey:publishableKey},cache:'no-store'});
  if(!response.ok)throw new Error('Google sign-in is currently unavailable. Please use your email and password.');
  const settings=await response.json();
  if(!settings.external?.google)throw new Error('Google sign-in is currently unavailable. Please use your email and password.');
  const {data,error}=await auth.signInWithOAuth({provider:'google',options:{redirectTo:googleCallbackUrl(origin,returnTo),queryParams:{prompt:'select_account'}}});
  if(error)throw error;
  return data;
}
