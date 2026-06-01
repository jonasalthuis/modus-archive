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
| **App Check** | Ties requests to the real app (reCAPTCHA) so the public API keys can't be abused from scripts. *(Needs a one-time console step — see below.)* |
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
- ✅ App Check wired into the app (activates as soon as a site key is set).

---

## Finishing steps (console — a few minutes each)

### 1. App Check (biggest remaining win)
1. [Firebase Console → App Check](https://console.firebase.google.com/project/modus-archive-nexus/appcheck) → register the **Web app** with **reCAPTCHA v3**. Copy the **site key**.
2. Set `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` in `.env.local` (local) and `apphosting.yaml` (production) — both have commented placeholders ready.
3. For local testing, run the app, open the browser console, copy the printed **App Check debug token**, and add it under App Check → **Manage debug tokens**. (Or set `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=true`.)
4. Once tokens are flowing, switch **Enforce** on for Firestore, Storage, and Authentication in the App Check console.

### 2. Budget & usage alerts
[Cloud Console → Billing → Budgets & alerts](https://console.cloud.google.com/billing) → create a budget (e.g. €20/month) with email alerts at 50 / 90 / 100%. Early warning if anything starts hammering the database or storage.

### 3. Two-factor auth on your accounts
Your admin access is only as strong as your Google / Microsoft login. Turn on 2-step verification for both `jonasalthuis@gmail.com` and `ale.rogno@live.com`.

### 4. Service-account least privilege (minor)
The `sheets-sync-bot@sidenotenexus.iam.gserviceaccount.com` key currently has `roles/viewer` on the `sidenotenexus` project and **nothing** on the archive project (good). Its real jobs — reading the Google Sheet and the GA4 property — are granted at the resource level (sheet sharing + GA4 property access), not via that IAM role, so `roles/viewer` can likely be removed for tighter least-privilege. Verify the Sheets sync and the analytics panel still work after removing it.

---

## If something looks wrong

- **A real domain** (when you get one): add it under Authentication → Settings → Authorised domains, or Google/Microsoft sign-in will fail there.
- **Microsoft secret expires 28 Nov 2026** — regenerate in Azure and update the Firebase Console before then.
- **Locked out?** The owner email is hard-wired as admin in code + rules as a safety net, so you can always get back in with that account.
