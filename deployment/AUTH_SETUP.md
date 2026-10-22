# Bella by RT production authentication

Dashboard status checked on 18 October 2026: the Site URL is already `https://www.bellabyrt.com`, the production callback/reset URLs are allowed, and email confirmation remains enabled. Six localhost/127.0.0.1 callback URLs were added and saved in this project. Google is still disabled because its Client ID and Client Secret are missing. Deploy the updated source to the existing Vercel project, keeping its existing Supabase environment variables. See VERCEL_REDEPLOY.md in this directory.

## 1. Fix confirmation and recovery redirects

In the Supabase project used by the live website, open Authentication → URL Configuration.

Site URL:

    https://www.bellabyrt.com

For another environment, use these redirect URLs. The current production project already has equivalent callback allowlist entries ending in `?**`, plus its reset URLs; those existing entries were preserved. Preview entries below are optional and were not added to the live project. Keep email confirmation enabled. Retain any other legitimate production redirects already used by your app. The double wildcard permits query/returnTo values on the specified callback path; the app also rejects unsafe return destinations.

    https://www.bellabyrt.com/auth/callback
    https://www.bellabyrt.com/auth/callback?returnTo=%2Faccount
    https://www.bellabyrt.com/auth/callback?returnTo=**
    https://www.bellabyrt.com/reset-password
    https://bellabyrt.drsagheer381.chatgpt.site/auth/callback
    https://bellabyrt.drsagheer381.chatgpt.site/auth/callback?returnTo=**
    https://bellabyrt.drsagheer381.chatgpt.site/reset-password

The updated app sends signup confirmation emails to the canonical www callback and password-reset emails to the canonical www reset route, including when requested from local development or a preview. Incoming tokens/codes are processed before guest/customer guards run. Legacy confirmation links to /login also complete their session before continuing to /account; recovery links remain on /reset-password. A URL that is not allowed by the Supabase project can still fall back to the project's Site URL, so the dashboard change is required. After updating settings, request a NEW confirmation/reset email; previously issued links can retain the old redirect.

## 2. Enable Continue with Google on localhost and production

On 18 October 2026, this project's public Auth settings reported `external.google: false` and email confirmation enabled. The signed-in dashboard confirmed that Google is disabled and its client credential fields are empty. A disabled Google provider causes the reported error on both localhost and production. The frontend cannot enable it: the Google OAuth client must be configured in Supabase. Google credential entry and activation are still required.

The Google button now returns to the exact localhost/loopback origin and port that started sign-in. The production apex and www hosts both return to `https://www.bellabyrt.com`. Signup confirmation and password-reset email links remain fixed to the www production host; they do not use the local Google callback.

These six local **Redirect URLs** were saved in Supabase → Authentication → URL Configuration alongside all 12 existing production entries (18 total). Site URL was kept on the www production domain. Add these when configuring any replacement project:

    http://localhost:4173/auth/callback?returnTo=**
    http://localhost:5173/auth/callback?returnTo=**
    http://localhost:3000/auth/callback?returnTo=**
    http://127.0.0.1:4173/auth/callback?returnTo=**
    http://127.0.0.1:5173/auth/callback?returnTo=**
    http://127.0.0.1:3000/auth/callback?returnTo=**

`npm run dev` starts on port 4173 by default. Use the exact URL printed by Vite; if you use another port or HTTPS, allow its exact origin and callback path too. An unallowed redirect can be replaced by Supabase's production Site URL. Local callbacks only work while that local server is running in the browser completing sign-in. No Google client secret belongs in the app's local environment file.

Create a Web Application OAuth client in Google Cloud for Bella by RT. Set the consent screen app name to Bella by RT. Add these Authorized JavaScript origins:

    https://www.bellabyrt.com
    https://bellabyrt.com
    http://localhost:4173
    http://localhost:5173
    http://localhost:3000
    http://127.0.0.1:4173
    http://127.0.0.1:5173
    http://127.0.0.1:3000

Use the exact OAuth callback URL displayed by Supabase → Authentication → Sign In / Providers → Google as Google's Authorized redirect URI. For the project bundled as the fallback in this source, it is:

    https://bpedttjsbmuvtyqehvnx.supabase.co/auth/v1/callback

If the live host uses a different VITE_SUPABASE_URL, use that project's callback instead. Enter the Google Client ID and Client Secret directly in the Google provider settings in Supabase, and enable Google. Do not put the secret in this React app, VITE variables, source control or a chat message. If the OAuth app is in Testing mode, add the intended test users or complete the production publishing requirements in Google Cloud.

Google's Authorized redirect URI is the Supabase URL ending in `/auth/v1/callback`, not the frontend's `/auth/callback`. Supabase receives Google's response first, then returns to the allowed frontend callback. Keep email confirmation enabled and leave nonce verification enabled.

After saving, click Continue with Google again; the button fetches fresh provider settings on every attempt. Check both `http://localhost:4173/login?returnTo=%2Faccount` and `https://www.bellabyrt.com/login?returnTo=%2Faccount`. Complete Google consent and verify that the account page opens on the host where you started (canonical www for production). Also test starting from checkout to confirm the return path and cart survive. This requires a real Google account and cannot be proven by mocked local tests.

## 3. Brand the emails

In Authentication → Email Templates → Confirm signup:

- Subject: Confirm your Bella by RT email
- Body: paste deployment/email-templates/confirmation.html

For Reset password:

- Subject: Reset your Bella by RT password
- Body: paste deployment/email-templates/recovery.html

Keep the {{ .ConfirmationURL }} placeholder intact. It preserves Supabase's secure verification link.

To change the FROM display name to Bella by RT and send from your own email address, configure Custom SMTP with a verified sender on your domain. Changing the HTML template alone does not change the mail sender identity.

## 4. Hosting and verification

The Vercel project root now includes vercel.json beside package.json with the SPA fallback to /index.html. It is an internal rewrite: it keeps the original query and fragment in the browser. There were no existing Vercel rules or local api/ routes in the available source. Supabase Edge Functions remain in supabase/functions. If your Vercel repository has newer API rules, retain them before the final fallback. public/_redirects is also retained for Netlify/Cloudflare Pages.

Verify a new email signup and confirmation on the production domain, a password reset, and Google sign-in on both localhost and production. Email links and production Google sign-in must stay on the production host; Google sign-in started locally must return to its original local host and port. Confirm that the customer reaches /account or the requested safe page. End-to-end tests need the dashboard settings and real Google OAuth configuration.

Official references:
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-email-templates
