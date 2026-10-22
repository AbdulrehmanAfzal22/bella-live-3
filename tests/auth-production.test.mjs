import test from 'node:test';
import assert from 'node:assert/strict';
import {authCallbackUrl,emailConfirmationUrl,googleCallbackUrl,passwordResetUrl,safeReturnTo} from '../src/lib/authRedirects.mjs';
import {beginGoogleSignIn} from '../src/lib/googleSignIn.mjs';

test('confirmation and recovery callbacks never point to localhost',()=>{
  for(const origin of ['http://localhost:3000','http://127.0.0.1:5173','http://[::1]:4173',undefined]){
    assert.equal(new URL(authCallbackUrl(origin)).origin,'https://www.bellabyrt.com');
    assert.equal(passwordResetUrl(origin),'https://www.bellabyrt.com/reset-password');
  }
  assert.equal(new URL(authCallbackUrl('https://www.bellabyrt.com','/checkout')).origin,'https://www.bellabyrt.com');
});
test('sign-in return paths reject external targets and authentication loops',()=>{
  for(const target of ['https://evil.test','//evil.test','/\\evil.test','/\nevil.test','/auth/callback','/login?returnTo=/checkout','/register',null])assert.equal(safeReturnTo(target),'/account');
  assert.equal(safeReturnTo('/checkout?step=payment'),'/checkout?step=payment');
});
test('Google sign-in waits for enabled provider and uses production callback',async()=>{
  let requested;
  const result=await beginGoogleSignIn({auth:{signInWithOAuth:async input=>{requested=input;return {data:{provider:'google'},error:null};}},supabaseUrl:'https://project.supabase.co/',publishableKey:'public-test-key',origin:'https://www.bellabyrt.com',returnTo:'/checkout',fetcher:async(url,options)=>{assert.equal(url,'https://project.supabase.co/auth/v1/settings');assert.equal(options.headers.apikey,'public-test-key');return {ok:true,json:async()=>({external:{google:true}})};}});
  assert.equal(result.provider,'google');assert.equal(requested.provider,'google');
  const callback=new URL(requested.options.redirectTo);assert.equal(callback.origin,'https://www.bellabyrt.com');assert.equal(callback.pathname,'/auth/callback');assert.equal(callback.searchParams.get('returnTo'),'/checkout');
});
test('disabled Google provider stays on the website without starting OAuth',async()=>{
  let calls=0;
  await assert.rejects(()=>beginGoogleSignIn({auth:{signInWithOAuth:async()=>{calls++;}},supabaseUrl:'https://project.supabase.co',publishableKey:'public-test-key',origin:'https://www.bellabyrt.com',fetcher:async()=>({ok:true,json:async()=>({external:{google:false}})})}),/currently unavailable/);
  assert.equal(calls,0);
});

// Email destinations remain canonical even when a request comes from a preview.
test('email confirmation and password recovery always use the www production host',()=>{
  for(const origin of ['https://bellabyrt.com','https://www.bellabyrt.com','https://preview.vercel.app','http://localhost:5173',undefined]){
    assert.equal(passwordResetUrl(origin),'https://www.bellabyrt.com/reset-password');
  }
  const confirmation=new URL(emailConfirmationUrl('/checkout?step=payment#details'));
  assert.equal(confirmation.origin,'https://www.bellabyrt.com');
  assert.equal(confirmation.searchParams.get('returnTo'),'/checkout?step=payment#details');
  assert.equal(new URL(authCallbackUrl('https://bellabyrt.com')).origin,'https://www.bellabyrt.com');
});
test('encoded and normalized authentication return paths cannot create redirect loops',()=>{
  for(const target of ['/./login','/%6cogin','/reset-password','/a/../register','/%5cevil.test','/%2f%2fevil.test','/%0aevil.test']){
    assert.equal(safeReturnTo(target),'/account',target);
  }
});

test('Google OAuth returns to the exact local host and port that started sign-in',async()=>{
  for(const origin of ['http://localhost:4173','http://localhost:5173','http://localhost:3000','http://127.0.0.1:4173','http://[::1]:4173','https://localhost:4173']){
    let requested;
    await beginGoogleSignIn({
      auth:{signInWithOAuth:async input=>{requested=input;return {data:{provider:'google'},error:null};}},
      supabaseUrl:'https://project.supabase.co',publishableKey:'public-test-key',origin,
      returnTo:'/checkout?step=payment&gift=yes#details',
      fetcher:async(_url,options)=>{
        assert.equal(options.cache,'no-store');
        return {ok:true,json:async()=>({external:{google:true}})};
      }
    });
    const callback=new URL(requested.options.redirectTo);
    assert.equal(callback.origin,origin);
    assert.equal(callback.pathname,'/auth/callback');
    assert.equal(callback.searchParams.get('returnTo'),'/checkout?step=payment&gift=yes#details');
    assert.equal(requested.options.queryParams.prompt,'select_account');
    assert.equal(new URL(emailConfirmationUrl('/account')).origin,'https://www.bellabyrt.com');
    assert.equal(passwordResetUrl(origin),'https://www.bellabyrt.com/reset-password');
  }
});

test('Google production callbacks use www while HTTPS preview callbacks keep their host',()=>{
  for(const origin of ['https://bellabyrt.com','https://www.bellabyrt.com']){
    assert.equal(googleCallbackUrl(origin),'https://www.bellabyrt.com/auth/callback?returnTo=%2Faccount');
  }
  assert.equal(new URL(googleCallbackUrl('https://preview.vercel.app')).origin,'https://preview.vercel.app');
});

test('Google local callbacks reject unsafe return destinations and non-HTTP local origins',()=>{
  for(const destination of ['https://evil.test','//evil.test','/%2f%2fevil.test','/login?returnTo=/account']){
    assert.equal(new URL(googleCallbackUrl('http://localhost:4173',destination)).searchParams.get('returnTo'),'/account');
  }
  for(const origin of ['http://localhost.evil.test:4173','http://192.168.1.10:4173','ftp://localhost:4173','javascript://localhost',undefined]){
    assert.equal(new URL(googleCallbackUrl(origin)).origin,'https://www.bellabyrt.com');
  }
});

test('Google sign-in checks the provider again after it is enabled',async()=>{
  let enabled=false;
  let oauthCalls=0;
  const args={
    auth:{signInWithOAuth:async()=>{oauthCalls++;return {data:{provider:'google'},error:null};}},
    supabaseUrl:'https://project.supabase.co',publishableKey:'public-test-key',origin:'http://localhost:4173',
    fetcher:async()=>({ok:true,json:async()=>({external:{google:enabled}})})
  };
  await assert.rejects(()=>beginGoogleSignIn(args),/currently unavailable/);
  enabled=true;
  await beginGoogleSignIn(args);
  assert.equal(oauthCalls,1);
});
