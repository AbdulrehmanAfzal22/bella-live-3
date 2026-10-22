# Bella by RT: email verification and Vercel deep links

## What changed

- Added `vercel.json` beside `package.json` with the requested SPA fallback. Direct requests for `/login`, `/register`, `/auth/callback`, `/reset-password` and `/account` now have a route to `index.html` when deployed with this configuration. The browser URL is not redirected to `/index.html`.
- Signup email links use `https://www.bellabyrt.com/auth/callback?returnTo=%2Faccount` by default. Password-reset email links use `https://www.bellabyrt.com/reset-password`. Both email destinations are fixed to the canonical production host, even from development or preview builds.
- Incoming Auth links are captured before Supabase consumes their fragment. The app waits for SDK initialization and validates the session before any guest/customer route redirects. Legacy `/login` confirmation links work too. Recovery links open the reset form. Codes and OTPs are not consumed twice by repeated effects.
- Internal return destinations keep their query/fragment, while external destinations and Auth redirect loops are rejected. The authentication parameters are removed by the final history-replacing navigation only after successful processing.
- Google OAuth started on localhost now returns to that exact loopback host and port. Production Google sign-in returns to the canonical www domain. The button rechecks uncached public provider settings on every attempt. Supabase's Google provider must still be enabled with the Google OAuth credentials and the local/production redirect allowlist in `AUTH_SETUP.md`.

The source contains no previous `vercel.json` or local `api/` directory to merge. Existing Supabase Edge Functions, commerce/admin code, design and the pre-existing local image edit are preserved. This ZIP is based on the latest source available in this conversation (including that local edit); changes made only in another repository or Vercel deployment cannot be recovered from a deployed bundle. Compare such newer changes before replacing your repository.

## Redeploy the existing Vercel project

1. Extract the ZIP. Open `bella-by-rt/`, the folder containing **both** `package.json` and `vercel.json`.
2. Update the existing Git repository connected to your existing Bella by RT Vercel project. Keep newer manual edits and any additional API configuration from that repository. Push the updated source, including `vercel.json`, to its production branch. Vercel will build a new deployment. Redeploying an older deployment alone will not include these new files.
3. In Vercel Settings, confirm the **Root Directory** is the folder containing these two files. Use framework preset **Vite**, build command **`npm run build`**, and output directory **`dist`**. Keep the existing production environment variables, especially `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Vite embeds them during build. Never put a service-role key, SMTP password or OAuth client secret in `VITE_*` variables.
4. Confirm `www.bellabyrt.com` belongs to this existing project and serves the new **Production** deployment. Keep it as the canonical host for Auth links. Do not add a redirect that strips the callback path or query string.
5. In **Supabase → Authentication → URL Configuration**, verify **Site URL** is `https://www.bellabyrt.com` and the callback/reset URLs in `AUTH_SETUP.md` are allowed. These production settings were confirmed in the live dashboard on 18 October 2026; six local Google callback URLs were also added and saved. Email confirmation remains enabled. Keep these settings if you deploy to the same Supabase project. An unallowed redirect can still fall back to the dashboard Site URL. Google credential entry and provider activation remain pending.
6. Keep confirmation/recovery email buttons pointed at `{{ .ConfirmationURL }}`. Optional Bella by RT email templates are in `deployment/email-templates/`. Request a **new** confirmation or reset email after deployment and URL configuration; old or already-used links may expire or retain old destinations.

## Verification

Completed locally:

- Unit/regression tests cover confirmation on legacy `/login`, account/checkout return destinations, recovery routing, asynchronous initialization, code/OTP handling, expired links, missing sessions and unsafe redirects.
- Google tests cover local ports 4173/5173/3000, 127.0.0.1 and IPv6 loopback handling, canonical production callbacks, query/fragment preservation, unsafe origins/return destinations, and retrying after provider activation. These use mocked OAuth responses, not a real Google account.
- Actual React route/guard render checks cover all five Auth/account paths, signed-in versus signed-out users, loading states, guest redirects and administrator protection. These checks use isolated Auth state, not a real account.
- Static checks verify the project-root Vercel rewrite covers all five paths and uses an internal rewrite rather than a redirect.
- `npm test` and `npm run build` results are reported with the delivered ZIP. No remote database schema/Auth settings are altered by these commands.

Requires your live Vercel deployment and Supabase settings:

| Check | Expected result |
| --- | --- |
| Open `/login?returnTo=%2Faccount` directly, then refresh | App sign-in form, no Vercel 404 |
| Open `/register` directly, then refresh | App registration form |
| Open `/auth/callback` directly without a token | App shows a friendly invalid-link message when signed out; no Vercel 404 |
| Open `/reset-password?mode=forgot` directly, then refresh | App reset-email request form |
| Open `/reset-password` directly | App reset form; an actual valid recovery session is required to update a password |
| Open `/account` signed out | App sends the customer to `/login?returnTo=%2Faccount` |
| Open/refresh `/account` signed in | Account loads; it remains protected |
| New signup → real confirmation email → click link | Verified session, then `/account` (or the requested safe local page), no localhost |
| New password reset email → click link | Valid recovery session and password form on `/reset-password`; update works |
| Expired/used email link | Friendly error and ability to request a fresh link |
| Google sign-in started on localhost | Returns to that local host and port, then `/account` or the original safe return path |
| Google sign-in started on production | Returns to `www.bellabyrt.com`, then `/account` or the original safe return path |
| Shop/cart/checkout/orders/admin smoke test | Existing behavior and permissions remain intact |

No real customer email was sent and no live Vercel deployment, customer Google login, checkout or admin operation was exercised as part of the local checks. Separately, the Supabase dashboard was accessed to confirm production Auth settings and save the six local callback URLs. Google provider activation remains pending the owner's Google OAuth credential entry.

Official documentation:

- https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas
- https://supabase.com/docs/guides/auth/redirect-urls
