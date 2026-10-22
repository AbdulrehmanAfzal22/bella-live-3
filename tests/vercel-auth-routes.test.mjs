import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../',import.meta.url));
const paths=['/login','/register','/auth/callback','/reset-password','/account'];

test('Vercel project-root fallback covers each direct authentication route without HTTP redirects',async()=>{
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  assert.ok(JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8')).scripts.build);
  const fallback=config.rewrites.at(-1);
  assert.deepEqual(fallback,{source:'/(.*)',destination:'/index.html'});
  for(const path of paths){
    assert.match(path,new RegExp(`^${fallback.source}$`));
    assert.match(`${path}?returnTo=%2Faccount`,new RegExp(`^${fallback.source}$`));
  }
  // Rewrites serve the app without changing the browser URL/query/fragment.
  assert.equal(config.redirects,undefined);
  assert.match(await readFile(new URL('../index.html',import.meta.url),'utf8'),/id="root"/);
});

test('actual React routes render auth pages and enforce guest, customer and admin guards',async()=>{
  const runtime=new URL('../.openai/runtime/',import.meta.url);
  await mkdir(runtime,{recursive:true});
  const outfile=new URL('vercel-auth-route-check.cjs',runtime);
  const result=await build({
    stdin:{resolveDir:root,sourcefile:'vercel-auth-route-check.jsx',loader:'jsx',contents:`
      import React from 'react';
      import {renderToStaticMarkup} from 'react-dom/server';
      import {MemoryRouter,Navigate} from 'react-router-dom';
      import assert from 'node:assert/strict';
      import AppRoutes from './src/routes/AppRoutes.jsx';
      import PublicRoute from './src/components/PublicRoute.jsx';
      import ProtectedRoute from './src/components/ProtectedRoute.jsx';
      import AdminRoute from './src/components/AdminRoute.jsx';
      const guest={user:null,admin:false,loading:false,error:'',refresh:async()=>{}};
      const customer={...guest,user:{id:'customer',email:'customer@example.test'}};
      function render(path,element,state=guest){
        globalThis.__bellaAuthTest=state;
        globalThis.window={location:new URL(path,'https://www.bellabyrt.com'),addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false,addListener(){},addEventListener(){},removeEventListener(){}})};
        return renderToStaticMarkup(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
      }
      function Probe({kind}){
        const child=<strong>GUARDED_CONTENT</strong>;
        const element=kind==='private'?ProtectedRoute({children:child}):kind==='admin'?AdminRoute({children:child}):PublicRoute({guestOnly:true,children:child});
        return element.type===Navigate?<output data-destination={element.props.to}/>:element;
      }
      export function check(){
        for(const [path,expected] of [
          ['/login','Welcome back.'],['/register','Make yourself at home.'],
          ['/reset-password','Choose a new password.'],['/auth/callback','Finishing your Bella by RT sign-in'],
        ]){
          const html=render(path,<AppRoutes/>);
          assert(html.includes(expected),path+' should render the app route');
          assert(!html.includes('Page not found'),path);
        }
        assert(render('/account',<AppRoutes/>,customer).includes('Loading your account'));
        const protectedGuest=render('/account?tab=orders#history',<Probe kind="private"/>);
        assert(protectedGuest.includes('/login?returnTo=%2Faccount%3Ftab%3Dorders%23history'));
        assert(!protectedGuest.includes('GUARDED_CONTENT'));
        assert(render('/account',<Probe kind="private"/>,customer).includes('GUARDED_CONTENT'));
        assert(render('/account',<Probe kind="private"/>,{...guest,loading:true}).includes('Checking your session'));
        assert(render('/login?returnTo=%2Fcheckout%3Fstep%3Dpayment',<Probe kind="guest"/>,customer).includes('/checkout?step=payment'));
        assert(render('/login?returnTo=%2Flogin',<Probe kind="guest"/>,customer).includes('data-destination="/account"'));
        assert(render('/register',<Probe kind="guest"/>).includes('GUARDED_CONTENT'));
        assert(!render('/admin',<Probe kind="admin"/>,customer).includes('GUARDED_CONTENT'));
        assert(render('/admin',<Probe kind="admin"/>,{...customer,admin:true}).includes('GUARDED_CONTENT'));
        delete globalThis.window;delete globalThis.__bellaAuthTest;
      }
    `},
    bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',
    define:{'import.meta.env':'{}'},loader:{'.css':'empty','.svg':'dataurl'},logLevel:'silent',
    plugins:[{name:'isolated-auth-state',setup(b){
      b.onResolve({filter:/\/hooks\/useAuth(?:\.js)?$/},()=>({path:'auth-state',namespace:'test-auth'}));
      b.onLoad({filter:/.*/,namespace:'test-auth'},()=>({contents:'export function useAuth(){return globalThis.__bellaAuthTest;}',loader:'js'}));
    }}],
  });
  await writeFile(outfile,result.outputFiles[0].contents);
  const checks=await import(pathToFileURL(fileURLToPath(outfile)).href);
  checks.check();
});
