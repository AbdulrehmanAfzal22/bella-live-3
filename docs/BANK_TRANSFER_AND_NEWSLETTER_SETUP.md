# PKR payments and new-arrival emails

## Checkout is enabled

Customers choose a receiving account:

| Option | Receiving number |
| --- | --- |
| JazzCash | 03210044435 |
| Bank Alfalah | 02351010329869 |

Both options display their logos and a Copy button. Account numbers retain leading zeros. Account titles were not provided and are therefore omitted; they can be added in Admin > Payments > Payment account settings.

Prices, product-editor labels, price filters, cart totals, checkout totals and new-arrival email prices now use PKR. Internal `*_cents` columns continue to hold minor units, interpreted as paisa for PKR. Numeric product prices were retained without applying an exchange rate. For example, an existing displayed price of 12.99 is now PKR 12.99. Set the actual selling prices in Admin > Products if those sample prices need replacement. Existing historical orders retain their recorded currency; new orders default to PKR.

## Customer and admin flow

1. Customer adds products to their cart and signs in.
2. Checkout shows delivery fields and both receiving accounts.
3. Customer chooses JazzCash or Bank Alfalah and transfers the exact displayed PKR total outside the website.
4. Customer enters their contact number and transaction ID, selects a payment screenshot, and clicks Submit payment & order.
5. Supabase stores the order, purchased items and quantities, chosen receiving account, contact number, transaction ID and private screenshot path. Stock reservation, order creation, payment-proof recording and cart clearing are atomic.
6. Admin > Payments displays the purchased products, customer name and ID, contact number, amount, transaction ID, receiving account and screenshot.
7. Admin verifies receipt of funds and clicks Verify payment & confirm order. This atomically marks payment paid, changes the order to confirmed, and records confirmation history.
8. Rejection requires a reason. The order remains pending/unpaid; the customer can submit corrected proof from Order details.

Customers cannot mark themselves paid or confirm orders. Bank-transfer orders cannot be confirmed or advanced through the old order-status controls while unpaid. Retrying a completed checkout returns the same order and does not reserve stock again.

The website uses the existing Supabase backend. A Firebase migration has not been performed: no Firebase project or configuration was supplied.

## WhatsApp and Contact Support

WhatsApp appears alongside Contact Support on every storefront route, including the support page. The configured WhatsApp destination is +92 321 0044435, using the supplied JazzCash number as the initial contact number. Change it in Admin > Payments > Payment account settings if your support number differs. The icon opens WhatsApp; the customer chooses whether to send a message.

## Homepage and layout

Accessories and Find Your Glow/Style remain commented out in `src/pages/Home.jsx`. The replacement product grid displays at most four rows at each screen size, with View More opening the complete shop.

The footer uses readable dark text on pink, a visible Subscribe button and a contained email field. Product cards, filter padding, checkout columns and payment fields have responsive layout overrides in `src/styles/ui-repairs.css` and `src/styles/payments.css`.

## Subscriptions and email configuration

Both homepage and footer Subscribe forms persist normalized email addresses. New products have a New arrival checkbox. Publishing a marked arrival queues a notification containing the name, description, PKR price, product link and unsubscribe link. Normal edits do not create duplicate queued deliveries for the same product/subscriber.

Email delivery still requires these server-only Supabase Edge Function secrets:

- `RESEND_API_KEY`: an email-sending API key.
- `EMAIL_FROM`: a verified sender, for example `Bella by RT <updates@your-domain.com>`.
- `SITE_URL`: your customer-facing HTTPS origin with product and unsubscribe routes.

Configure them in Supabase Dashboard > Edge Functions > Secrets. They must never be put into frontend `VITE_*` variables. Gmail addresses work as recipients; this implementation sends via Resend rather than signing in to an owner's Gmail account.

The `new-arrival-emails` function is deployed and a cron job checks the queue every five minutes. Until sender configuration is complete, emails remain queued. Admin > Subscribers shows subscriptions and delivery statuses.

The existing hosted Site retains owner-only access. If customers use a public deployment elsewhere, set SITE_URL to that public domain. This update does not change sharing/access.

## Receipt security

The `payment-receipts` bucket is private and accepts JPEG/PNG/WebP up to 5 MB. Upload paths start with the authenticated customer's user ID. Only the owner and admin can view receipts, through expiring signed URLs. A screenshot or transaction ID is evidence for manual review, not an automatic confirmation from a bank.

## Local run

```
npm install
npm run dev
npm test
npm run build
```

The ZIP includes source, assets, lockfile and production build. node_modules, Git history and runtime QA files are omitted.
