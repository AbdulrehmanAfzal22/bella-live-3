import {useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {supabase} from '../lib/supabase';
import {completeAuthRedirect,readAuthRedirect} from '../lib/authCallback.mjs';
import {useAuth} from '../hooks/useAuth';
import {Loading} from '../components/Feedback';

export default function AuthCallback({link:incomingLink,onComplete}){
  const navigate=useNavigate(),{refresh}=useAuth();
  const [link]=useState(()=>incomingLink||readAuthRedirect(window.location.href));
  const [error,setError]=useState('');
  useEffect(()=>{
    let active=true;
    async function complete(){
      try{
        const {destination}=await completeAuthRedirect(supabase.auth,link);
        await refresh();
        if(active){navigate(destination,{replace:true});onComplete?.();}
      }catch(err){if(active)setError(err.message||'Please try signing in again.');}
    }
    complete();return()=>{active=false;};
  },[link,refresh,navigate,onComplete]);
  return error?<section className="page auth-callback"><h1>Let’s try that again.</h1><p role="alert">{error}</p><Link className="button" to="/login" replace onClick={onComplete}>Back to sign in</Link></section>:<Loading label="Finishing your Bella by RT sign-in…"/>;
}
