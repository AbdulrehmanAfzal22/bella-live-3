import {sellingPrice} from '../lib/productPricing';
import { uuid } from '../lib/uuid';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useQuery } from '../hooks/useQuery';
import { getAddresses } from '../services/account';
import { shippingFromSavedAddress } from '../lib/shippingAddress';
import { placeBankOrder,placeOrder } from '../services/checkout';
import {getBankSettings,uploadReceiptImage} from '../services/payments';
import {validatePaymentProof} from '../lib/paymentProof';
import {paymentOptions,normalizeContactNumber} from '../lib/paymentOptions';
import BankTransferForm from '../components/commerce/BankTransferForm';
import PaymentMethodChoice from '../components/commerce/PaymentMethodChoice';
import '../styles/payments.css';
import { Loading, ErrorState, Empty } from '../components/Feedback';
import CheckoutSteps from '../components/commerce/CheckoutSteps';
import ShippingForm from '../components/commerce/ShippingForm';
import OrderSummary from '../components/commerce/OrderSummary';
import '../styles/commerce-flow.css';

const SHIPPING_CENTS = 0;

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useCart(user?.id);
  const addressesQuery = useQuery(() => getAddresses(user.id), [user?.id]);
  const bankQuery=useQuery(getBankSettings,[]);
  const [provider,setProvider]=useState('jazzcash');
  const [paymentMethod,setPaymentMethod]=useState('bank_transfer');
  const [transactionId,setTransactionId]=useState(''),[file,setFile]=useState(null);
  const receipt=useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploading,setUploading]=useState(false);
  const [error, setError] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [shipping, setShipping] = useState({ full_name: '', line1: '', city: '', postal_code: '', country: 'Pakistan', phone: '' });
  const requestId = useRef(uuid());
  const codRequestId = useRef(uuid());

  const availablePayments=paymentOptions(bankQuery.data);
  useEffect(()=>{const options=paymentOptions(bankQuery.data);if(options.length&&!options.some(o=>o.id===provider))setProvider(options[0].id);},[bankQuery.data,provider]);

  if (query.loading && !query.data) return <Loading label="Preparing checkout…" />;
  if (query.error) return <ErrorState error={query.error} retry={query.refresh} />;

  const items = query.data || [];
  const unavailable = items.some(item => !item.product_variants?.products || !item.product_variants.active || item.product_variants.stock < item.quantity);
  const subtotal = items.reduce((sum, item) => sum + sellingPrice(item.product_variants?.products) * item.quantity, 0);

  if (!items.length) return <div className="page checkout-experience checkout-experience--empty"><Empty variant="premium" eyebrow="Bella by RT · Checkout" title="Your collection awaits." text="Add a considered piece to your collection before continuing." link="/shop" action="Explore the collection"/></div>;

  function handleAddressChange(event) {
    const address = addressesQuery.data?.find(item => item.id === event.target.value);
    setSelectedAddress(event.target.value);
    setShipping(shippingFromSavedAddress(address));
  }

  function handleFieldChange(field, value) {
    setSelectedAddress('');
    setShipping(current => ({...current,[field]:value}));
  }

  async function selectReceipt(selected){
    setUploading(true);setFile(null);receipt.current=null;setError('');
    try{
      const uploaded=await uploadReceiptImage(selected,requestId.current);
      receipt.current=uploaded;setFile(uploaded.file);
      return uploaded.file;
    }finally{setUploading(false);}
  }

  async function submit(event) {
    event.preventDefault();
    if(busy||uploading)return;
    setBusy(true);
    setError('');
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const shippingAddress = { full_name: form.full_name, line1: form.line1, city: form.city, postal_code: form.postal_code, country: form.country, phone: form.phone };
    try {
      const contactNumber=normalizeContactNumber(shippingAddress.phone);
      let order;
      if(paymentMethod==='cod'){
        order=await placeOrder({...shippingAddress,phone:contactNumber},codRequestId.current);
      }else{
        if(!availablePayments.some(option=>option.id===provider))throw new Error('Choose an available payment account.');
        validatePaymentProof(transactionId,file);
        if(!receipt.current||receipt.current.file!==file)throw new Error('Choose and upload your payment screenshot first.');
        order=await placeBankOrder(shippingAddress,requestId.current,transactionId,receipt.current.path,contactNumber,provider);
      }
      toast.success(paymentMethod==='cod'?'Cash on Delivery order received. Our team will confirm it.':'Order received. Your payment is awaiting review.');
      navigate(`/order-confirmation/${order.order_id}`);
    } catch (submitError) { setError(submitError.message); toast.error(submitError.message); }
    finally { setBusy(false); }
  }

  return <div className="page checkout-experience">
    <header className="commerce-page-header checkout-page-header"><p className="commerce-eyebrow">Bella by RT · A considered checkout</p><h1>Almost yours.</h1><p>Your pieces are waiting. Complete your details to place the order.</p><Link to="/cart">Return to your collection</Link></header>
    <CheckoutSteps />
    {unavailable && <p className="commerce-inline-alert" role="alert">Some pieces are unavailable. <Link to="/cart">Update your collection</Link> before placing the order.</p>}
    <div className="checkout-experience__layout">
      <form id="checkout-form" className="checkout-form-experience" onSubmit={submit}>
        <ShippingForm shipping={shipping} addresses={addressesQuery.data||[]} selectedAddress={selectedAddress} onAddressChange={handleAddressChange} onFieldChange={handleFieldChange} addressError={addressesQuery.error}/>
        <PaymentMethodChoice method={paymentMethod} onChange={method=>{setPaymentMethod(method);setError('');}} contactNumber={shipping.phone} onContactChange={value=>handleFieldChange('phone',value)} amount={subtotal} busy={busy||uploading}/>
        {paymentMethod==='bank_transfer'&&(bankQuery.loading&&!bankQuery.data?<p role="status">Loading payment details…</p>:bankQuery.error&&!bankQuery.data?<ErrorState error={bankQuery.error} retry={bankQuery.refresh}/>:availablePayments.length?<BankTransferForm settings={bankQuery.data} provider={provider} setProvider={setProvider} contactNumber={shipping.phone} setContactNumber={value=>handleFieldChange('phone',value)} amount={subtotal} transactionId={transactionId} setTransactionId={setTransactionId} setFile={selectReceipt} file={file} busy={busy||uploading}/>:<p className="commerce-inline-alert" role="alert">Bank transfer is being set up. <Link to="/contact-support">Contact the store</Link> before paying.</p>)}
        {error && <p className="commerce-inline-alert commerce-inline-alert--error" role="alert">{error}</p>}
      </form>
      <OrderSummary items={items} subtotal={subtotal} shipping={SHIPPING_CENTS} unavailable={unavailable} busy={busy} disabled={uploading||(paymentMethod==='bank_transfer'&&(!file||!availablePayments.length||!!bankQuery.error||bankQuery.loading))} paymentMethod={paymentMethod} formId="checkout-form"/>
    </div>
  </div>;
}
