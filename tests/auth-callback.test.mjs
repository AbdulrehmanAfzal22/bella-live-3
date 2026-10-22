import test from 'node:test';
import assert from 'node:assert/strict';
import {readAuthRedirect,completeAuthRedirect} from '../src/lib/authCallback.mjs';

const host='https://www.bellabyrt.com';
function client(overrides={}){
  return {
    initialize:async()=>({error:null}),
    getSession:async()=>({data:{session:{user:{id:'customer'}}},error:null}),
    getUser:async()=>({data:{user:{id:'customer'}},error:null}),
    ...overrides,
  };
}

test('legacy login confirmation keeps the requested destination and consumes session first',async()=>{
  const calls=[];
  const link=readAuthRedirect(`${host}/login?returnTo=%2Fcheckout%3Fstep%3Dpayment%23details#access_token=test&refresh_token=test&type=signup`);
  const auth=client({
    initialize:async()=>{calls.push('initialize');return {error:null};},
    getSession:async()=>{calls.push('session');return {data:{session:{}},error:null};},
    getUser:async()=>{calls.push('validate');return {data:{user:{id:'customer'}},error:null};},
  });
  assert.equal(link.shouldHandle,true);
  assert.deepEqual(await completeAuthRedirect(auth,link),{destination:'/checkout?step=payment#details'});
  assert.deepEqual(calls,['initialize','session','validate']);
});

test('confirmation callback defaults to account; ordinary login is not intercepted',()=>{
  assert.equal(readAuthRedirect(`${host}/auth/callback#access_token=test`).destination,'/account');
  assert.equal(readAuthRedirect(`${host}/login?returnTo=%2Faccount`).shouldHandle,false);
  assert.equal(readAuthRedirect(`${host}/register`).shouldHandle,false);
});

test('recovery type is retained after SDK fragment removal and never redirects to account',async()=>{
  const link=readAuthRedirect(`${host}/login?returnTo=%2Faccount#access_token=test&refresh_token=test&type=recovery`);
  assert.deepEqual(await completeAuthRedirect(client(),link),{destination:'/reset-password'});
  assert.equal(readAuthRedirect(`${host}/reset-password?code=pkce`).destination,'/reset-password');
});

test('callback waits for asynchronous SDK initialization before reading the session',async()=>{
  let release,ready=false;
  const initialized=new Promise(resolve=>{release=resolve;});
  const auth=client({
    initialize:async()=>{await initialized;ready=true;return {error:null};},
    getSession:async()=>{assert.equal(ready,true);return {data:{session:{}},error:null};},
  });
  const pending=completeAuthRedirect(auth,readAuthRedirect(`${host}/auth/callback#access_token=test`));
  assert.equal(ready,false);release();await pending;
});

test('SDK-consumed PKCE code is not exchanged twice',async()=>{
  const link=readAuthRedirect(`${host}/auth/callback?code=one-use&returnTo=%2Faccount`);
  const auth=client({exchangeCodeForSession:()=>{throw new Error('Must not exchange twice');}});
  assert.deepEqual(await completeAuthRedirect(auth,link,()=>`${host}/auth/callback?returnTo=%2Faccount`),{destination:'/account'});
});

test('unconsumed PKCE code is exchanged once across concurrent effects',async()=>{
  let calls=0;
  const href=`${host}/auth/callback?code=one-use`;
  const link=readAuthRedirect(href);
  const auth=client({exchangeCodeForSession:async code=>{assert.equal(code,'one-use');calls++;return {error:null};}});
  const first=completeAuthRedirect(auth,link,()=>href);
  assert.equal(first,completeAuthRedirect(auth,link,()=>href));
  await first;assert.equal(calls,1);
});

test('custom token-hash confirmation template verifies the OTP only once',async()=>{
  let calls=0;
  const link=readAuthRedirect(`${host}/auth/callback?token_hash=test-hash&type=email`);
  const auth=client({verifyOtp:async input=>{calls++;assert.deepEqual(input,{token_hash:'test-hash',type:'email'});return {error:null};}});
  await Promise.all([completeAuthRedirect(auth,link),completeAuthRedirect(auth,link)]);
  assert.equal(calls,1);
});

test('expired/error links cannot reuse an existing signed-in session',async()=>{
  for(const href of [
    `${host}/login#error=access_denied&error_code=otp_expired`,
    `${host}/auth/callback?error=access_denied`,
    `${host}/auth/callback?token_hash=invalid&type=unknown`,
  ]){
    await assert.rejects(completeAuthRedirect(client(),readAuthRedirect(href)),/request a new email/);
  }
});

test('initialization, missing-session and validation failures never continue to account',async()=>{
  for(const auth of [
    client({initialize:async()=>({error:new Error('expired')})}),
    client({getSession:async()=>({data:{session:null},error:null})}),
    client({getUser:async()=>({data:{user:null},error:new Error('invalid JWT')})}),
  ])await assert.rejects(completeAuthRedirect(auth,readAuthRedirect(`${host}/auth/callback`)),/could not be verified/);
});

test('missing PKCE verifier cannot silently accept an unrelated existing session',async()=>{
  const href=`${host}/auth/callback?code=unknown`;
  const auth=client({exchangeCodeForSession:async()=>({error:new Error('PKCE verifier missing')})});
  await assert.rejects(completeAuthRedirect(auth,readAuthRedirect(href),()=>href),/could not be verified/);
});
