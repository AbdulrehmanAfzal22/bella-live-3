import {useEffect,useState} from 'react';
import {Outlet,useLocation} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {usePageMetadata} from '../hooks/usePageMetadata';
import {supabase} from '../lib/supabase';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminHeader from '../components/admin/AdminHeader';
import './AdminLayout.css';
import '../components/admin/admin-experience.css';

const adminTitles={'/admin/love-gallery':'Why you love us','/admin':'Dashboard','/admin/products':'All Products','/admin/products/create':'Create product','/admin/categories':'Collections','/admin/collections':'Collections','/admin/accessories':'Accessories','/admin/payments':'Payments','/admin/newsletter':'Subscribers','/admin/orders':'Orders','/admin/customers':'Customers','/admin/inventory':'Inventory','/admin/analytics':'Analytics','/admin/reviews':'Reviews Management','/admin/support':'Support Inbox'};

export default function AdminLayout(){
  const {user}=useAuth();
  const location=useLocation();
  const title=location.pathname.includes('/edit')?'Edit product':adminTitles[location.pathname]||'Administration';
  const [collapsed,setCollapsed]=useState(()=>window.innerWidth<=1100);
  const [isMobile,setIsMobile]=useState(()=>window.innerWidth<=900);
  const [mobileOpen,setMobileOpen]=useState(false);
  useEffect(()=>{const resize=()=>{const mobile=window.innerWidth<=900;setIsMobile(mobile);if(!mobile)setMobileOpen(false);};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useEffect(()=>{if(!mobileOpen)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';const closeOnEscape=event=>{if(event.key==='Escape')setMobileOpen(false);};window.addEventListener('keydown',closeOnEscape);return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',closeOnEscape);};},[mobileOpen]);
  const effectiveCollapsed=collapsed&&!isMobile;
  usePageMetadata({title:`${title} · Studio`,description:'Bella by RT store administration.',noindex:true});

  return <div className={`admin-layout admin-layout--premium ${effectiveCollapsed?'is-collapsed':''}`}>
    <AdminSidebar user={user} collapsed={effectiveCollapsed} mobile={isMobile} mobileOpen={mobileOpen} onToggle={()=>setCollapsed(value=>!value)} onClose={()=>setMobileOpen(false)} onSignOut={()=>supabase.auth.signOut()}/>
    <div className="admin-main"><AdminHeader pathname={location.pathname} user={user} collapsed={effectiveCollapsed} mobileOpen={mobileOpen} onToggle={()=>setCollapsed(value=>!value)} onMenu={()=>setMobileOpen(true)}/><main className="admin-content"><Outlet/></main></div>
  </div>;
}
