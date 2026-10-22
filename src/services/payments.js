import {supabase,unwrap} from '../lib/supabase';
import {validatePaymentProof} from '../lib/paymentProof';
import {saveReceiptImage,prepareReceiptImage} from '../lib/receiptUpload';
export const getBankSettings=async()=>unwrap(await supabase.from('bank_transfer_settings').select('*').eq('id',true).single());
export const saveBankSettings=async values=>unwrap(await supabase.from('bank_transfer_settings').update({...values,updated_at:new Date().toISOString()}).eq('id',true).select().single());
export async function uploadPaymentProof(transactionId,file,requestId){
 file=await prepareReceiptImage(file);
 validatePaymentProof(transactionId,file);
 return (await saveReceiptImage(supabase,file,requestId)).path;
}
export const uploadReceiptImage=(file,requestId)=>saveReceiptImage(supabase,file,requestId);
export const getOrderPayment=async orderId=>unwrap(await supabase.from('payment_submissions').select('*').eq('order_id',orderId).maybeSingle());
export async function receiptUrl(path){return unwrap(await supabase.storage.from('payment-receipts').createSignedUrl(path,300)).signedUrl;}
export const getAdminPayments=async()=>unwrap(await supabase.from('payment_submissions').select('*,orders(order_number,total_cents,currency,status,payment_status,shipping_address,order_items(*))').order('updated_at',{ascending:false}));
export const reviewPayment=async(id,status,note)=>unwrap(await supabase.rpc('review_bank_payment',{p_payment_id:id,p_status:status,p_note:note}));
export async function resubmitPayment(orderId,transactionId,file,contactNumber){const path=await uploadPaymentProof(transactionId,file,orderId);return unwrap(await supabase.rpc('resubmit_bank_payment_v2',{p_order_id:orderId,p_transaction_id:transactionId.trim(),p_screenshot_path:path,p_contact_number:contactNumber}));}
