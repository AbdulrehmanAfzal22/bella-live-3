import {attachPurchaseCounts} from './productPurchaseStats';
import { supabase } from "../lib/supabase";

export async function searchProducts({
  query = "",
  category = null,
  minPrice = null,
  maxPrice = null,
  sort = "newest",
}) {
  let request = supabase
    .from("products")
    .select(`
      *,
      categories!inner(name, slug),
      product_images(*),
      product_variants(*)
    `)
    .eq("status", "published");

  if (query) {
    request = request.ilike("name", `%${query}%`);
  }

  if (minPrice !== null) {
    request = request.gte("effective_price_cents", Math.round(Number(minPrice)*100));
  }

  if (maxPrice !== null) {
    request = request.lte("effective_price_cents", Math.round(Number(maxPrice)*100));
  }

  if (category) {
    request = request.eq("categories.slug", category);
  }

  if (sort === "price_low") {
    request = request.order("effective_price_cents", { ascending: true });
  } else if (sort === "price_high") {
    request = request.order("effective_price_cents", { ascending: false });
  } else {
    request = request.order("created_at", { ascending: false });
  }

  const { data, error } = await request;

  if (error) throw error;

  return attachPurchaseCounts(data || []);
}
