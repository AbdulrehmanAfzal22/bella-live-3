# Purchase banner update

The seven published product IDs present during this update have fixed random starting figures between 100 and 500. They are stored in src/lib/purchaseSeeds.js, remain stable across visits and devices, and are configured promotional sample figures rather than historical order records. Names are decorative aliases from the supplied list, never actual customer identities. Two illustrated SVG avatars are used, with no photographs.

The total equals the fixed starting figure plus the database count of distinct confirmed purchasers. The two displayed names are included in that total: a total of 422 displays two names followed by “and 420 more people have bought this”. New product IDs have no starting figure and show “0 people have bought this — Be the first to shop this piece”. With one confirmed purchaser, one alias is displayed; with two or more, two aliases are displayed.

Existing database purchase tracking is retained. Paid or delivered orders qualify; cancelled and refunded orders do not. Repeat orders by the same customer count once per product, because this is a people count rather than a unit or order count. Bank transfers count after approval, not when someone adds an item to the cart or submits an unverified receipt. Refunds/cancellations can reduce the confirmed count.

A shared batched request refreshes visible banner counts every 30 seconds and when the tab regains focus or becomes visible. On an optional count refresh failure, the last known count remains. On initial count failure, the banner stays hidden. Product grids, new arrivals and product detail banners all use the same component.

No database changes are required for the existing connected Bella project. For an entirely new database, apply the existing supabase/updates/product_purchase_stats.sql after the base schema. The fixed starting figures apply only to the seven captured IDs; deleting and recreating a product gives it a new ID and a zero starting figure.

Run npm install, npm run build, then node serve.mjs for a local production preview. The ZIP includes source and rebuilt dist.

Validation: 74 automated tests passed and production build succeeded. A read-only query confirmed aggregate purchase statistics are available for all seven published products. No live orders or customer data were changed.

Name revision: all aliases use English spellings of Pakistani names. Each existing product receives a unique pair, with no names repeated across the seven products. Future products display their confirmed count without reusing an existing alias pair; assign additional unique names in src/lib/purchaseBanner.js if desired.

Cart revision: opening a product now automatically selects an active, in-stock colour and size. One Piece is selected automatically when available. Changing colour selects its first in-stock size. Shoppers can still change options, and sold-out selections remain unavailable. Existing sign-in requirements are unchanged. Validation: 77 automated tests passed; production build succeeded.
