# Security

How the archive is protected, what's already in place, and the few console steps that finish the job.

---

## The layers

| Layer | What it does |
|---|---|
| **Site auth gate** | The whole site is private — every visitor must sign in (staff account) or redeem an invite code. |
| **Roles** (`users` collection) | admin / editor / viewer, enforced in the UI **and** the database rules. |
| **Firestore security rules** | Server-side rules on every read/write. Published content is readable by signed-in users; only staff can read drafts or write; only admins manage users & invites. |
| **Storage security rules** | Images are publicly readable (the gated site shows them) but only **staff** can upload/overwrite. |
| **Image downscaling** | Photos are resized to web resolution **in the browser before upload**, so the public bucket never holds full-res originals — the real defence against high-res scraping. |
| **App Check** | Ties requests to the real app (reCAPTCHA v3) so the public API keys can't be abused from scripts. |
| **Email verification** | Password accounts must verify their email before access. OAuth (Google/Microsoft) accounts are verified by the provider. |
| **PITR + daily backups** | 7-day point-in-time recovery and 14-day daily backups — recover from accidental or malicious deletes. |

> **Why API keys in the code are OK:** Firebase "API keys" are public identifiers, not secrets. Security is enforced by the rules + auth above, not by hiding the key. The only true secret is the **service-account JSON** in `functions/` — that must never be committed (it's gitignored).

---

## Already done

- ✅ Role-based Firestore rules (admin / editor / viewer), deployed.
- ✅ Storage rules tightened — staff-only writes (previously any signed-in user, incl. guests, could upload).
- ✅ Invite redemption rule — guests can only increment a code's use count, nothing else.
- ✅ Service-account key gitignored.
- ✅ Point-in-time recovery enabled (7-day window).
- ✅ Daily Firestore backups (14-day retention).
- ✅ Email verification gate for password accounts.
- ✅ Images downscaled to web resolution before upload (full-res never reaches the public bucket).
- ✅ App Check wired in; reCAPTCHA v3 registered for **"Modus Archive Web"**, secret key saved,
  localhost debug token registered.

---

## App Check — registration done; enforcement is the last switch

The site key (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`) is in `.env.local` + `apphosting.yaml`; the secret
key lives only in the App Check console. App Check is **registered and monitoring**, but **not yet
enforced**.

> **Which app:** App Check is registered to **"Modus Archive Web"** (`…web:aa68…`) — the App ID the
> client actually uses (`NEXT_PUBLIC_FIREBASE_APP_ID`). There's a second, unused web app
> (`modus-archive`, `…web:3898…`) — ignore it.

**Before flipping Enforce on, know the two ways it can lock you out:**

1. **The deployed build must contain the App Check SDK.** Auto-deploy is **off**, and the live build
   predates App Check — so the live site currently sends *no* App Check token. Enforcing now blocks
   the live URL until you **redeploy** (a manual App Hosting rollout). Localhost is fine (debug token).
2. **The serving domain must be in the reCAPTCHA allow-list.** Production
   (`modus-archive--modus-archive-nexus.us-central1.hosted.app`) is **not** yet — add it in the
   reCAPTCHA admin console, or every real visitor's token fails.

**Safe order to enforce in production:** add the prod domain to reCAPTCHA → redeploy the site →
watch the App Check **Requests** view show *verified* traffic → then **Enforce** per service.

To enforce: [App Check console](https://console.firebase.google.com/project/modus-archive-nexus/appcheck)
→ **APIs** tab → for **Cloud Firestore**, **Cloud Storage**, **Authentication** click **Enforce**.
It's reversible instantly (un-enforce) if anything goes wrong.

### Budget & usage alerts
[Cloud Console → Billing → Budgets & alerts](https://console.cloud.google.com/billing) → create a budget (e.g. €20/month) with email alerts at 50 / 90 / 100%. Early warning if anything starts hammering the database or storage.

### Two-factor auth on your accounts
Your admin access is only as strong as your Google / Microsoft login. Turn on 2-step verification for both `jonasalthuis@gmail.com` and `ale.rogno@live.com`.

### Service-account least privilege (minor)
The `sheets-sync-bot@sidenotenexus.iam.gserviceaccount.com` key currently has `roles/viewer` on the `sidenotenexus` project and **nothing** on the archive project (good). Its real jobs — reading the Google Sheet and the GA4 property — are granted at the resource level (sheet sharing + GA4 property access), not via that IAM role, so `roles/viewer` can likely be removed for tighter least-privilege. Verify the Sheets sync and the analytics panel still work after removing it.

---

## Protecting the images (high-res downloads)

The honest constraint: **anything a browser displays can be saved at the resolution shown** — you
can't truly stop a screenshot or "save image as". What you *can* control is the resolution that's
ever served. The approach here:

- **Downscale at upload** — `src/lib/downscaleImage.ts` caps every uploaded image to ~1600px on its
  longest edge and re-encodes it. The public bucket (`models/images/…`) therefore only contains
  web-resolution images. There is no full-res file to grab.
- **Keep masters private** — if you want to retain originals, they belong in the staff-only
  `ma_high_res/` path (read denied to the public). That path isn't wired into the upload UI yet.
- **Existing images** uploaded before this change are still full-res in the bucket. To fully close
  the gap you'd re-process them (download, downscale, re-upload) — a one-off migration, not yet done.
- Want stronger? Options for later: the **Resize Images** Firebase Extension (auto-derivatives +
  private originals), or serving through an image CDN that only emits sized variants.

### 2. Budget & usage alerts
[Cloud Console → Billing → Budgets & alerts](https://console.cloud.google.com/billing) → create a budget (e.g. €20/month) with email alerts at 50 / 90 / 100%. Early warning if anything starts hammering the database or storage.

### 3. Two-factor auth on your accounts
Your admin access is only as strong as your Google / Microsoft login. Turn on 2-step verification for both `jonasalthuis@gmail.com` and `ale.rogno@live.com`.

### 4. Service-account least privilege (minor)
The `sheets-sync-bot@sidenotenexus.iam.gserviceaccount.com` key currently has `roles/viewer` on the `sidenotenexus` project and **nothing** on the archive project (good). Its real jobs — reading the Google Sheet and the GA4 property — are granted at the resource level (sheet sharing + GA4 property access), not via that IAM role, so `roles/viewer` can likely be removed for tighter least-privilege. Verify the Sheets sync and the analytics panel still work after removing it.

---

## ⚠️ When you connect a real domain — do all three

Adding a custom domain isn't enough; three separate allow-lists each need it, or things break:

1. **Firebase Auth → Settings → Authorised domains** — add the domain, or Google/Microsoft sign-in fails there.
2. **reCAPTCHA admin console → your site → Domains** — add the domain, or every visitor's **App Check** token fails (and if App Check is enforced, they're locked out). Currently only `localhost` is listed.
3. **App Hosting** — point DNS / add the custom domain in the App Hosting console.

(App Check status as of setup: registered for "Modus Archive Web", reCAPTCHA v3 secret saved, localhost debug token registered, `localhost` added to reCAPTCHA domains. Still to do: add the production domain here, watch verified traffic, then turn on **Enforce**.)

## If something looks wrong

- **Microsoft secret expires 28 Nov 2026** — regenerate in Azure and update the Firebase Console before then.
- **Locked out?** The owner email is hard-wired as admin in code + rules as a safety net, so you can always get back in with that account.
