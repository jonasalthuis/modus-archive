# Modus Archive — CLAUDE.md

Project context for Claude Code. Loaded automatically at the start of every session.

---

## Project overview

**Modus Archive** is a public digital archive of architectural scale models made by **Network Modelmakers**, a London workshop active 1978–2014. Clients included Rogers, Hadid, Herzog & de Meuron, Chipperfield, Jiricna, and others.

Built by:
- **Jonas Althuis** — tech (Next.js, Firebase, CMS)
- **Alessandro Rognoni** — content (archival research, interviews, photography)

Grant funding: Stimuleringsfonds Creative Industries (€9,990) + EFL Stichting (€12,200).
Collection size: ~850 models, ~1,500 photographs.

---

## Key commands

```bash
# Development
pnpm dev           # Start dev server at localhost:3000
pnpm build         # Production build
pnpm lint          # ESLint
pnpm tsc --noEmit  # Type-check without building

# Firebase
firebase deploy --only hosting          # Deploy Next.js app
firebase deploy --only functions        # Deploy Cloud Functions
firebase deploy --only firestore:rules  # Deploy Firestore rules

# Cloud Functions (from /functions directory)
cd functions && npm run build           # Compile TS → JS before deploying
```

**Package manager: pnpm** — always use `pnpm add`, never `npm install`.

---

## Tech stack

| Layer | Tool | Version |
|---|---|---|
| Framework | Next.js App Router | 15.1.9 |
| Language | TypeScript | 5.7+ |
| Styling | Tailwind CSS | 3.4 |
| Database | Firebase Firestore | firebase 12.x |
| Auth | Firebase Auth | firebase 12.x |
| File storage | Firebase Storage | firebase 12.x |
| CMS | FireCMS | 3.1.0 (`@firecms/firebase` + `@firecms/core`) |
| i18n | next-intl | 3.26 |
| Functions | Firebase Cloud Functions | Node 22 |
| Deployment | Google Cloud App Hosting | project: `modus-archive-nexus` |

---

## Repo layout

```
modus-archive/
├── src/
│   ├── app/
│   │   └── [locale]/                        # All routes are locale-prefixed (/en/, /nl/)
│   │       ├── layout.tsx                   # Root layout — wraps everything in NextIntlClientProvider
│   │       ├── page.tsx                     # Homepage
│   │       ├── archive/page.tsx             # Collection grid — Firestore fetch, client-side search + filter
│   │       ├── models/[id]/page.tsx         # Model detail — server component, redesigned split-screen template
│   │       ├── articles/page.tsx            # Articles list — currently hardcoded, needs Firestore
│   │       ├── articles/[slug]/page.tsx     # Article detail — needs Firestore
│   │       └── admin/[[...any]]/page.tsx    # FireCMS — catch-all for FireCMS client-side routing
│   ├── collections/
│   │   ├── models.ts                        # FireCMS collection def: ma_models (22 fields + Storage)
│   │   └── articles.ts                      # FireCMS collection def: ma_articles (Storage for heroImage)
│   ├── components/
│   │   ├── AudioPlayer.tsx                  # "use client" — play/pause, scrubber, timestamps
│   │   ├── ModelImageGallery.tsx            # "use client" — gallery with prev/next, thumbnails, photographer credit
│   │   └── repo-ui/                         # Legacy shared UI (Button, DashboardLayout, StripePaymentForm)
│   ├── cms/                                 # Legacy custom CMS — superseded by FireCMS, keep for reference
│   ├── lib/
│   │   └── firebase.ts                      # Firebase client init — exports: app, auth, db, storage
│   ├── i18n.ts                              # next-intl config
│   ├── middleware.ts                        # Locale redirect middleware
│   └── globals.css
├── functions/
│   └── src/
│       ├── index.ts                         # HTTP trigger: syncModelsFromSheet()
│       └── sync.ts                          # Google Sheets → Firestore sync
│                                            # Headers on row 4, data from row 5
│                                            # REF col → modelNumber (doc ID, zero-padded: "0042")
├── messages/
│   ├── en.json                              # English translations
│   └── nl.json                              # Dutch translations
├── firestore.rules                          # Currently: allow r/w if auth != null (no role checks yet)
├── firebase.json
├── apphosting.yaml                          # GCP App Hosting config
├── next.config.ts                           # next-intl plugin + Firebase Storage image hostname
└── tailwind.config.ts
```

---

## Environment variables

All required in `.env.local`. All are `NEXT_PUBLIC_` because they're used in client components.

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

---

## Design system

The visual language is **minimalist archival / institutional**. Pages should feel like a well-designed museum catalogue, not a consumer web app. No gradients, no shadows, no rounded corners.

### Typography conventions
- **Large headlines**: `font-light tracking-tight leading-[1.05]`
- **Section labels / metadata keys**: `text-[9px] uppercase tracking-[0.4em] font-bold text-stone-300`
- **Body / notes text**: `text-base font-light text-stone-600 leading-relaxed`
- **Model numbers / timestamps**: `font-mono text-stone-400`
- **Buttons / CTAs**: `text-[9px] uppercase tracking-[0.3em] font-bold`

### Colour palette — stone scale only
- Background: `bg-white`
- Primary text: `text-stone-900`
- Secondary: `text-stone-500` / `text-stone-400`
- Muted labels: `text-stone-300`
- Hairline borders: `border-stone-100`
- Subtle borders: `border-stone-200`
- Hover fill: `bg-stone-50`
- Selected/active: `bg-stone-900 text-white`

### Interaction patterns
- Hover reveals: `opacity-0 group-hover:opacity-100 transition-opacity duration-500`
- Hover borders: `border-stone-100 hover:border-stone-900 transition-colors`
- Transitions: `duration-300` for fast interactions, `duration-500` for reveals
- No `box-shadow` — use borders only
- No `border-radius` — everything sharp-cornered

### Layout conventions
- Max content width: `max-w-7xl mx-auto`
- Section padding: `px-8 py-20` (desktop), tighter on mobile
- Section dividers: `border-b border-stone-100` — never `<hr>`

---

## Firebase / data

### Firestore collections

#### `ma_models` (~850 documents)
Document ID = `modelNumber` zero-padded to 4 digits (e.g. `"0042"`).

| Field | Type | Source | Notes |
|---|---|---|---|
| `modelNumber` | string | Sheets sync | REF # — also the doc ID |
| `title` | string | Sheets sync | Project name and phase |
| `architect` | string | Sheets sync | |
| `year` | number | Sheets sync | |
| `scale` | string | Sheets sync | e.g. "1:200" |
| `modelSize` | string | Sheets sync | Physical dimensions |
| `materials` | string[] | Sheets sync | Split from comma-separated column |
| `buildingType` | string | Sheets sync | |
| `modelType` | string | FireCMS | "presentation" \| "study" \| "urban" \| "structural" \| "competition" \| "detail" |
| `buildingStatus` | string | FireCMS | "built" \| "unbuilt" \| "competition" \| "demolished" \| "unknown" |
| `location` | string | Sheets sync | Building location |
| `purpose` | string | Sheets sync | |
| `leadMaker` | string | Sheets sync | |
| `otherMakers` | string | Sheets sync | |
| `raStudio` | string | Sheets sync | |
| `photographer` | string | Sheets sync | |
| `provenance` | string | Sheets sync | Current physical location |
| `archivalMaterial` | string | Sheets sync | |
| `rating` | string | Sheets sync | |
| `notes` | string | Sheets sync / FireCMS | Free-form description |
| `images` | string[] | FireCMS upload | **Firebase Storage download URLs** |
| `voiceNarrative` | string | FireCMS upload | **Firebase Storage download URL** for audio |
| `isVisible` | boolean | FireCMS | Controls public visibility |
| `updatedAt` | timestamp | Sheets sync | Server timestamp |

#### `ma_articles`
| Field | Type | Notes |
|---|---|---|
| `title` | string | |
| `slug` | string | URL path segment |
| `author` | string | |
| `publishDate` | date | |
| `heroImage` | string | Firebase Storage download URL |
| `excerpt` | string | |
| `content` | string | Markdown |
| `tags` | string[] | |
| `isVisible` | boolean | Published flag |

#### `ma_users`
Authorized CMS users. `role` field: `"admin"` | `"editor"` | `"viewer"` — defined but not yet enforced in Firestore rules.

### Firebase Storage structure
```
models/images/     ← model photographs
models/audio/      ← voice narratives / recordings
articles/images/   ← article hero images
```

FireCMS uploads store the **download URL** in Firestore (not the storage path) because `storeUrl: true` is set in collection definitions. Use these URLs directly in `<Image src={...}>` and `<audio src={...}>`.

### Google Sheets → Firestore sync
- Cloud Function: `syncModelsFromSheet()` — HTTP POST trigger
- Call: `POST /syncModelsFromSheet?sheetId=SHEET_ID&range=Sheet1!A:Z`
- Headers on **row 4**, data starts **row 5**
- Column mapping defined in `functions/src/sync.ts`
- Sync writes all metadata fields but does **not** touch `images` or `voiceNarrative` — those are managed via FireCMS

---

## Architecture notes

### Server vs client components
- **Server components by default** — fetch Firestore data directly in `async` page components
- Use `"use client"` only for interactive UI: state, hooks, event handlers, browser APIs
- `ModelImageGallery` and `AudioPlayer` are client components — the model detail page is server, importing them
- Never import client-only libraries in server components

### FireCMS admin (`/admin`)
- `FireCMSFirebaseApp` from `@firecms/firebase` 3.1.0
- The `[[...any]]` catch-all lets FireCMS manage its own client-side routing
- Collection definitions live in `src/collections/` — edit these to add/change fields
- Firebase is initialised with the same config as the main app; the singleton pattern in `firebase.ts` prevents duplicate app errors
- Sign-in options: Google OAuth + email/password

### i18n routing
- All routes under `[locale]/` — middleware handles detection and redirect
- Locales: `en` (default), `nl`
- Server components: `const t = await getTranslations('namespace')`
- Client components: `const t = useTranslations('namespace')`
- **Known gap**: archive and model detail pages don't use translations yet

### Firestore security rules (current — intentionally minimal)
```
allow read, write: if request.auth != null;
```
Role-based enforcement is **not yet implemented**.

---

## Current build status

### Working
- Homepage (archival aesthetic, static placeholder cards)
- Archive grid — Firestore fetch, client-side search, type filter
- Model detail template — Firebase Storage image gallery, audio player, full metadata
- FireCMS admin — models + articles collections, Storage upload for images/audio
- Google Sheets → Firestore sync (Cloud Function)
- EN/NL i18n routing

### TODO / known gaps
1. **Articles page** — hardcoded; wire up `getDocs` from `ma_articles` (same pattern as archive)
2. **Article detail** — route exists, no Firestore fetch
3. **Homepage featured models** — static `01–04`; should query real featured models
4. **Google Drive → Storage migration** — photos/audio are in Google Drive; need migration script to upload to Storage and write URLs back to Firestore `images` / `voiceNarrative` fields
5. **About page** (`/about`) — linked from nav, page doesn't exist
6. **Research/thematic page** (`/research`) — linked from nav, page doesn't exist
7. **Global nav header** — no shared nav component across pages
8. **Firestore rules** — add role-based enforcement using `ma_users.role`
9. **Archive pagination** — loads all ~850 records at once; needs cursor pagination
10. **Stripe / payment** — `StripePaymentForm.tsx` exists, no backend or flow

---

## Deployment

- **Platform**: Google Cloud App Hosting
- **GCP Project**: `modus-archive-nexus`
- **Firestore region**: nam5
- **Functions region**: us-central1
- **Build output mode**: `standalone` (set in `next.config.ts`)
- **Functions runtime**: Node 22
- **Service account key**: `functions/sidenotenexus-dc9441f42cca.json` — never commit this file

### Active development
Development happens in git worktrees under `.claude/worktrees/`. Changes must be merged to `main` before deploying.

---

## System Architecture

A detailed reference document of the entire system lives in Notion:

**System Architecture page**: `https://www.notion.so/3278a87ce8c0814ea6fefb6aa2fa7ea4`

This page covers: infrastructure map, route structure, Firestore schema, Storage layout, Cloud Functions, all key workflows (Sheets sync, image upload, migration, deployment), environment variables, and known gaps.

### When to update the System Architecture page

Update it whenever a **structural change** is made to the system — not for routine feature work, but for:

- A new route, page, or major component is added
- Firestore schema changes (new collection, new field with non-obvious behaviour)
- Firebase Storage structure changes
- A Cloud Function is added, changed, or removed
- Deployment configuration changes (apphosting.yaml, firebase.json)
- A known gap is resolved (e.g. images wired up, rules enforced, pagination added)
- Firebase client (`src/lib/firebase.ts`) is changed (e.g. `storage` exported)
- Auth model or Firestore security rules are changed

**Always check this page** at the start of any large implementation task to orient yourself on the current state of the system before making changes.

---

## Notion task tracking

All major dev work is tracked in the **MODUS TIMELINE** database in Notion, linked to the **Modus** project.

- **Notion task database (data source)**: `collection://84e8a87c-e8c0-838e-adb3-8739c42ce77d`
- **Modus project page**: `https://www.notion.so/f458a87ce8c0829bad548168afde34e2`
- **Development Timeline view**: `https://www.notion.so/d898a87ce8c0826f8f3f01194fe1f2cd?v=3278a87ce8c081dba674000c791505f9`

### When to update Notion

After completing any of the following, mark the relevant task as **Done** (or **In progress** when starting):

- A feature is fully implemented and working (e.g. images wired up, nav built, pagination added)
- A significant infrastructure change (e.g. Firestore rules updated, migration script run)
- A new major work item is discovered that isn't already tracked — create a new task
- A deployment to production

**Do NOT update for**: minor style tweaks, small bug fixes, mid-feature WIP commits, or refactors within an already-tracked task.

### Task fields to use

```
Task name      — short descriptive title
Completed?     — "Not started" | "In progress" | "Done"
Priority       — "High" | "Medium" | "Low"
Effort         — "Small" | "Medium" | "Large"
Section        — "Main Active Phase" | "Technical" | "Continuation"
Tags           — ["Development"]
Project        — link to Modus project page above
```

### Current tracked tasks (as of 2026-03-18)

**Done**
| Task | Notion URL |
|---|---|
| Figure out Backend Architecture | https://www.notion.so/8b18a87ce8c083eca8ea81689a2b19d1 |
| Set up Backend Architecture Systems | https://www.notion.so/e608a87ce8c08220b5f401fb378ed089 |
| Firebase Hosting | https://www.notion.so/f128a87ce8c0837f9951010dfdf2a09b |
| Firestore DB | https://www.notion.so/a758a87ce8c0835d9ec18123edfbf834 |

**Not started — High priority**
| Task | Notion URL |
|---|---|
| Archive MVP Launch (milestone) | https://www.notion.so/5b38a87ce8c0832f986301bd39f971f3 |
| Firebase Storage — wire images to archive grid & model detail | https://www.notion.so/3278a87ce8c08155a8c4c5379f0dc69c |
| Global navigation header component | https://www.notion.so/3278a87ce8c081129dbcd8dc06ffd395 |
| Archive pagination — cursor-based Firestore queries | https://www.notion.so/3278a87ce8c0813fb755e90f56850f0d |
| Google Drive → Firebase Storage migration script | https://www.notion.so/3278a87ce8c08183971cc75e5ec3dd0d |

**Not started — Medium priority**
| Task | Notion URL |
|---|---|
| Image DB Flow | https://www.notion.so/77f8a87ce8c08260bc300197f87732f1 |
| Articles page — Firestore fetch | https://www.notion.so/3278a87ce8c081a7946cedaebf14954a |
| Article detail page — Firestore connection | https://www.notion.so/3278a87ce8c081c6a466dada1e5f965c |
| Homepage — real featured models from Firestore | https://www.notion.so/3278a87ce8c0812bb159f94bcbb07140 |
| Audio player — voiceNarrative integration | https://www.notion.so/3278a87ce8c081039d93edbafb8fe84d |
| About page — route and content | https://www.notion.so/3278a87ce8c0810fba9bcfe641f8027a |
| Firestore security rules — role-based enforcement | https://www.notion.so/3278a87ce8c081c2a3bced459ea9b640 |
| TEST AND IMPROVE (milestone) | https://www.notion.so/61e8a87ce8c082809899013b95849f47 |

**Not started — Low priority**
| Task | Notion URL |
|---|---|
| Research/thematic page — route and content | https://www.notion.so/3278a87ce8c081018a81f330243b559f |
| Stripe payment flow — complete backend + UI | https://www.notion.so/3278a87ce8c081f5a303fa8b530487d3 |

**Not started — No priority**
| Task | Notion URL |
|---|---|
| Research system for transferring Google Drive to Firebase Storage | https://www.notion.so/3278a87ce8c0808cb1accbf1a2235981 |
| Think about branding and title | https://www.notion.so/3278a87ce8c0805ea160e9c41e647b84 |
