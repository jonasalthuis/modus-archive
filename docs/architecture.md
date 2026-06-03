# Architecture & Operations

A map of the whole system — what runs where, how the pieces connect, and **where to look when
something breaks**. Written so you (or a future collaborator) can return cold and orient quickly.

> Companion docs: **Security** (the protection layers in depth), **Content & URLs** (data model &
> identifiers), **Admin Guide** (day-to-day use), **Access & Invites** (auth & guests).

---

## 1. The stack at a glance

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router, React 19) | `output: standalone` |
| Language / styling | TypeScript, Tailwind CSS 3.4, shadcn/ui | Inter font, stone palette |
| Database | **Firebase Firestore** (native) | region `nam5` |
| Auth | **Firebase Auth** | Google + Microsoft + email/password + anonymous (guests) |
| File storage | **Firebase Storage** | images + audio |
| Hosting | **Firebase App Hosting** (Cloud Run under the hood) | region `us-central1` |
| Functions | Firebase Cloud Functions (Node 22) | Google Sheets → Firestore sync |
| Analytics | Firebase Analytics + GA4 Data API | dashboard panel |
| Abuse protection | Firebase App Check (reCAPTCHA v3) | see Security doc |
| Package manager | **pnpm** (Node 24 via nvm locally) | |

**Firebase project:** `modus-archive-nexus` (this is where Firestore, Storage, Auth, App Hosting,
App Check all live).

**A second GCP project, `sidenotenexus`,** only exists to hold the `sheets-sync-bot` service
account (used for the Sheets sync + GA4 Data API). Don't confuse the two.

---

## 2. Hosting & deployment

- **Backend:** App Hosting backend `modus-archive` in `us-central1`.
- **Live URL (default domain):** `https://modus-archive--modus-archive-nexus.us-central1.hosted.app`
- **Auto-deploy from `main` is DISABLED** (`rolloutPolicy.disabled: true`). **Pushing to GitHub does
  NOT deploy.** You must trigger a build/rollout manually (Firebase Console → App Hosting → roll out,
  or `firebase deploy`). ⚠️ This means **the live site can lag behind `main`** — check the build date
  if production behaves like an older version.
- **Rules deploy separately** from the app:
  - `firebase deploy --only firestore:rules`
  - `firebase deploy --only storage`
  - These take effect immediately and are independent of the app build.

### Local dev
```bash
nvm use v24.4.0            # Node 24 required for pnpm
pnpm dev                   # localhost:3000
pnpm build                 # production build (run before deploying / to catch errors)
pnpm tsc --noEmit          # type-check
```
A **dev-only bypass** in `SiteAuthGate` skips the public login gate when `NODE_ENV=development`, so
you can work on the public site locally without logging in. It's never active in a real build.

---

## 3. Environment variables

| Variable | Purpose | Set in |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config (apiKey, authDomain, projectId, etc.) | `.env.local` + `apphosting.yaml` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | = `…web:aa68…` → the **"Modus Archive Web"** app (the one App Check is registered to) | both |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | GA4 web stream `G-ZKYJVT1GS4` | both |
| `GA4_PROPERTY_ID` | `539501183` — GA4 Data API (dashboard analytics) | `apphosting.yaml` (RUNTIME) |
| `GOOGLE_APPLICATION_CREDENTIALS` | path to the service-account key — **local only**, for the analytics API route | `.env.local` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | App Check reCAPTCHA v3 site key (public) | both |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | `true` on localhost only — prints a debug token | `.env.local` only (never prod) |

> The public Firebase keys are **not secrets** (they ship in the browser). The only real secret is
> the service-account JSON in `functions/` — it's gitignored and must never be committed.

---

## 4. Auth & roles

Full detail in **Access & Invites** and **Security**. In brief:

- The whole site is gated — every visitor signs in (staff) or redeems an invite code (anonymous guest).
- **`AuthProvider` / `useAuth`** (`src/lib/auth.tsx`) resolves the signed-in user → a status:
  `loading | signed-out | guest | unverified | authorised | unauthorised`, plus a role.
- **Roles live in the `users` collection** (keyed by lowercase email): `admin | editor | viewer`.
  Enforced in the admin UI *and* the Firestore rules.
- **Bootstrap admin:** `jonasalthuis@gmail.com` is hard-wired as admin in both `src/lib/auth.tsx`
  (`BOOTSTRAP_ADMINS`) and `firestore.rules` (`isBootstrapAdmin`) — a lock-out safety net.
- Two gates use this: `SiteAuthGate` (public site) and `CMSEngine` (admin).

---

## 5. Firestore — collections

| Collection | Doc ID | Notes |
|---|---|---|
| `ma_models` | 4-digit model number (`0042`) | the catalogue. Synced from Google Sheets + edited in CMS |
| `ma_articles` | slug | "artefacts" (texts). Public path `/artefacts/{slug}` |
| `ma_dossiers` | slug | curated thematic pages. Public path `/dossiers/{slug}` |
| `users` | lowercase email | accounts + roles |
| `ma_invites` | auto-id | guest access codes `NMA-XXXX-XXXX` |

> The content collections still carry the legacy `ma_` prefix; `users` was renamed off it. Renaming
> the content ones is a data migration (hundreds of docs) — not yet done.

Field-level reference is in **Content & URLs**.

---

## 6. Storage — layout

| Path | Read | Write | Contents |
|---|---|---|---|
| `models/images/{modelNumber}/…` | public | staff | model photographs (web-res; see below) |
| `models/audio/{modelNumber}/…` | public | staff | voice narratives |
| `articles/images/…` | public | staff | artefact hero images |
| `ma_high_res/…` | staff | staff | reserved for high-res masters (not wired into UI) |
| everything else | denied | staff | default-deny |

- **Images are downscaled in the browser before upload** (`src/lib/downscaleImage.ts`, longest edge
  ~1600px, re-encoded). The public bucket therefore only ever holds **web-resolution** images —
  the real protection against high-res scraping. Originals are not retained unless explicitly put in
  the staff-only `ma_high_res/` path.
- Storage rules read roles from the `users` collection via `firestore.get()`.

---

## 7. Cloud Functions

- **`syncModelsFromSheet`** (`functions/src/sync.ts`) — HTTP trigger that reads a Google Sheet and
  upserts into `ma_models`. Headers on row 4, data from row 5; REF column → `modelNumber` (doc ID,
  zero-padded). Authenticates as the `sheets-sync-bot` service account; the target sheet must be
  **shared with that service-account email**.
- Deploy: `cd functions && npm run build && firebase deploy --only functions`.

---

## 8. Front-end structure

| Route | What it is |
|---|---|
| `/` | homepage |
| `/archive` | collection grid (client-side Firestore fetch + filter) |
| `/models/[id]` | **model canvas** — a draggable/zoomable freeform board of cards |
| `/artefacts`, `/artefacts/[slug]` | artefact list + detail |
| `/dossiers`, `/dossiers/[slug]` | dossier list + detail |
| `/account` | logged-in user's profile (name, email, role, sign out) |
| `/admin` | the CMS (self-gated by role) |
| `/api/analytics` | server route → GA4 Data API (dashboard) |

### The model canvas (`src/components/canvas/`)
- `ModelCanvas` lays out **cards** (title, meta, notes, audio, featured, gallery, strip, photo) in
  canvas-space with pan/zoom, pin-in-place, and per-model layout saved to `localStorage`.
- Image rendering: **Featured** (main + secondary), **Gallery** (full-screen lightbox), **Strip**
  (2–3 side-by-side, row or column), **Single** photo. Driven by `model.featured` + `model.imageGroups`.

### The admin / CMS (`src/cms/`)
- `engine.tsx` — the shell: role-filtered sidebar, view routing, "New content" menu.
- `components/GenericCollection` + `GenericEditor` + `DataTable` — the reusable table + editor used by
  Models / Artefacts / Dossiers / Users.
- `views/` — Dashboard, Account, Invites, **DossierEditor** (full-screen), **GuidesView** (this docs
  viewer).
- `components/ImportModelsPanel` — CSV/Excel batch import for models.
- Image editors: `ImageGalleryEditor`, `ImageGroupsEditor`, `FeaturedImagesEditor`.

### The Knowledge Center
- The Markdown files in `/docs` are the single source of truth. They're imported as raw strings
  (webpack rule in `next.config.ts` + `src/types/markdown.d.ts`) and rendered in-app by `GuidesView`.
  The list lives in `src/cms/guides/registry.ts`. **To add a guide: drop a `.md` in `/docs` and add
  one entry to `GUIDES`.**

---

## 9. When something breaks — look here first

| Symptom | Most likely cause / where to look |
|---|---|
| Live site looks like an old version | Auto-deploy is off — **trigger a manual App Hosting rollout**; check the build date |
| "Permission denied" reading/writing data | `firestore.rules` — role check; confirm the account is in `users` with the right role |
| Can't upload images | Storage rules (staff-only write); or the model number isn't set yet |
| Google/Microsoft login fails on a domain | Domain missing from **Auth → Authorised domains** |
| Microsoft login rejected for a personal account | Azure app must allow personal accounts (`signInAudience`) + token v2 |
| Everything blocked after enabling App Check | App Check **enforced** but the domain isn't in the reCAPTCHA allow-list, or the deployed build predates App Check |
| Analytics panel shows an error | `/api/analytics` — GA4 Data API enabled? service account has GA4 Viewer? `GA4_PROPERTY_ID` set? |
| Sheets sync does nothing | Sheet not shared with the `sheets-sync-bot` service account; or function not deployed |
| New user "Not authorised" | They're not in the `users` collection — add them (admin → Users) |
| Locked out entirely | Sign in with the bootstrap-admin account (`jonasalthuis@gmail.com`) |
| Rules changed but no effect | Rules deploy separately: `firebase deploy --only firestore:rules,storage` |

---

## 10. Known gaps / future work

- Content collections still use the `ma_` prefix (rename = data migration).
- Archive grid thumbnail still uses the legacy "hero" star, not Featured-main.
- `ma_high_res/` master-image path exists in rules but isn't wired into the upload UI.
- App Check enforcement + production reCAPTCHA domain (see Security).
- Cursor-based pagination for the ~850-model archive (currently loads all).
- Stripe payment flow is scaffolded but incomplete.
