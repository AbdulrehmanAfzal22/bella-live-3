import {Navigate,Outlet,useLocation} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {Loading} from './Feedback';
import {safeReturnTo} from '../lib/authRedirects.mjs';

export default function PublicRoute({children,guestOnly=false}){
  const {user,loading}=useAuth();
  const location=useLocation();
  if(guestOnly&&loading)return <Loading label="Checking your session…"/>;
  if(guestOnly&&user){
    const requested=new URLSearchParams(location.search).get('returnTo');
    return <Navigate to={safeReturnTo(requested)} replace/>;
  }
  return children||<Outlet/>;
}
