# Seven-product catalog and sale prices

The previous 50 products were deleted from Supabase, including their obsolete cart references. The storefront now has seven published products and two active categories. Previous unused categories remain inactive.

| Product | Category | Original price | Sale price | Initial stock |
| --- | --- | --- | --- | --- |
| Cherry Velvet Lip Gloss | Simple | PKR 1,600 | Not set | 25 |
| Cocoa Kiss Lip Gloss | Simple | PKR 1,600 | Not set | 25 |
| Blue Stardust Glitter Gloss | Glitter | PKR 1,600 | Not set | 25 |
| Pink Crystal Glitter Gloss | Glitter | PKR 1,600 | Not set | 25 |
| Bronze Glow Glitter Gloss | Glitter | PKR 1,600 | Not set | 25 |
| Rose Veil Shimmer Gloss | Glitter | PKR 1,600 | Not set | 25 |
| Blush Bloom Glitter Gloss | Glitter | PKR 1,600 | Not set | 25 |

The stock quantity of 25 each was selected by the user. One piece is the purchasable unit; no bottle volume or formulation claims were invented. Product descriptions describe the visible colour and finish. Categories were assigned from the supplied images and can be edited in Admin > Products.

The seven supplied PNG images were uploaded without modification. The grid displays the full photograph, including the portrait image. Product image files are stored in the existing Supabase product-images bucket.

## Set a sale price

Open Admin > Products > Edit product:

- Original price (PKR): the normal listed price.
- Sale price (PKR, optional): a positive price lower than the original price.

For example, original 1,600 and sale 1,300 displays the original price crossed out and PKR 1,300 beside it. Clearing Sale price restores the original price. No sale prices were invented for the seven products.

This display is shared by product cards, homepage arrivals, product details, quick view, wishlist, cart and the admin product list. Cart totals, checkout totals, price sorting and price filters use the actual selling price. The database computes effective_price_cents from sale_price_cents or price_cents; server checkout records the actual selling price in order items. Historical orders retain their purchased price if a sale is removed later.

New-arrival notification snapshots also use the actual selling price. Email sender setup is still described in BANK_TRANSFER_AND_NEWSLETTER_SETUP.md.

## Verification

- 37 JavaScript tests passed.
- 12 live database sale-price checks passed, with all fixtures rolled back.
- The checks covered discounted server totals, order-item price snapshots, invalid discounts, customer write restrictions, admin save, sale removal and full-price fallback.
- Price component render checks passed for crossed-out original price, sale display and no-sale display.
- Production build passed.
- Catalog verification confirmed seven published products, seven real uploaded images, original price PKR 1,600, empty sale prices and stock 25 each.

Browser visual testing was unavailable in this environment. No admin upload account was created. The temporary signing mechanism was restricted to seven exact image paths and closed immediately after producing the upload slots.
