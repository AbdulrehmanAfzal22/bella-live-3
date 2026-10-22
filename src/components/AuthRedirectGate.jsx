import {useCallback,useState} from 'react';
import {initialAuthRedirect} from '../lib/supabase';
import AuthCallback from '../pages/AuthCallback';

export default function AuthRedirectGate({children}){
  const [pending,setPending]=useState(!!initialAuthRedirect?.shouldHandle);
  const finish=useCallback(()=>setPending(false),[]);
  // Includes legacy links to /login or /account. Do not let a guest/protected
  // guard discard a code, recovery type or token before session initialization.
  return pending?<AuthCallback link={initialAuthRedirect} onComplete={finish}/>:children;
}
