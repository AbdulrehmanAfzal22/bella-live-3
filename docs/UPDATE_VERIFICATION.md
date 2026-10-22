# Verification for the PKR payment update

- Production build: passed.
- JavaScript regression tests: 33 passed, including PKR formatting, historical currency, payment account availability, leading zeros, contact-number validation and WhatsApp URL generation.
- General payment/newsletter database regression checks: 29 passed with rolled-back fixtures.
- Live positive checkout suite: 17 passed using a disposable authenticated QA customer and two real images uploaded through the Storage API. It verified both receiving accounts, stored contact number/transaction/screenshot, order items, PKR totals, cart clearing, stock reservation, idempotent retry, owner/admin separation and atomic admin confirmation.
- Authenticated receipt upload and owner signed-link access: passed.
- Payment form render checks: both providers passed, including logos, PKR amount, required contact field, transaction ID and file upload input.
- Temporary products/orders/admin membership were rolled back; uploaded QA receipts were deleted through the Storage API and the QA session signed out. The disposable QA user was deleted; cleanup verified zero QA users, receipts, products and orders.

No real money was transferred. The admin must still verify payment in the bank/JazzCash account before approving.

Browser visual QA was unavailable in this environment. UI repairs were based on the supplied shop and checkout screenshots, stylesheet inspection and rendered component checks. No claim of a visual browser test is made.

New-arrival inbox delivery is not verified: email sender secrets remain unconfigured. The email function is deployed with PKR pricing and authenticated scheduled callbacks.

The security advisor reports no new payment/subscription finding. Pre-existing notices remain: password breach protection is disabled, and three private/server-only tables have RLS without policies. Password settings guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
