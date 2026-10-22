# Clickable product cards

Click anywhere on a product image, name, category, colour swatch, price, or card padding to open that product.

Updated layouts: shop, home product grid, new arrivals, recommendations, category/search grids, and wishlist. Wishlist, quick-view, and remove buttons remain separate actions. Native links support keyboard activation and opening a product in another tab. Carousel drags suppress accidental product navigation.

The existing Bellabyrt Supabase configuration is retained. No database migration is required.

## Run and deploy

Install dependencies with `npm ci`, then use `npm run dev` locally or `npm run build` for production. This archive includes a rebuilt `dist` folder. For Vercel, upload/push the project source and redeploy using the existing configuration. For static hosting, upload the contents of `dist` and retain the single-page-app fallback.

## Validation

- All 69 existing automated tests pass.
- Production build succeeds.
- Rendered catalog, recommendation, new-arrivals, and wishlist cards each have one native product link covering the displayed product details, with action buttons outside that link.
- An interactive browser check could not run because the browser download was unavailable.

Dependencies and macOS archive metadata are omitted; `npm ci` installs the appropriate dependencies for your computer.
