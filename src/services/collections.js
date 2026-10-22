import {attachPurchaseCounts} from './productPurchaseStats';
import { supabase } from "../lib/supabase";

const select = "*,categories(name,slug),product_images(*),product_variants(*)";

export async function getFeaturedProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(select)
    .eq("featured", true)
    .eq("status", "published");

  if (error) throw error;
  return attachPurchaseCounts(data || []);
}

export async function getNewArrivals() {
  const { data, error } = await supabase
    .from("products")
    .select(select)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;
  return attachPurchaseCounts(data || []);
}
