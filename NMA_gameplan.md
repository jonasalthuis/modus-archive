# NMA — Platform Game Plan
*Synthesised from: spec sheet (29.03.26) + design brainstorm sketchbook*
*Written: 27.05.26*

---

## What this platform is

A curated archive website. Two content types — **Models** and **Dossiers** — presented with a scrapbook/physical cabinet aesthetic. The feeling is discovery-driven and slow. Not a database. Not a portfolio. More like opening a drawer in an archive room.

**Branding mark**: NMA / NET(WORK)

---

## Confirmed design decisions (from brainstorm)

These are locked — the sketchbook resolves the open questions from the spec:

| Decision | Resolved |
|---|---|
| Model page pattern | **Drawer** — slides in from side, grid stays visible behind it |
| Dossier scrolling | **"2× scrolls"** — content blocks scroll within the page |
| Constellation tech | **Scrollable canvas** — zoom in/out, pan, pin, move items |
| Menu behaviour | **Always hidden/collapsed** — revealed on hover/click |
| Prototype model count | **19 models**, ±5 photos each |
| Dossier count | **~20 dossiers**, ~20 models each |
| Photo sizes | **Big / Small toggle** per image, click to cycle between photos |
| Importance expression | **1/2/3 → layout size + prominence** (not just a tag) |
| Scale reference | **#10 numbers** shown on each model page |
| Share/social version | **Out of scope v1** — noted as future toggle |

---

## Site map

```
/                        Landing page (Grid view ↔ Constellation view)
  /models/[id]           → Opens as Drawer (intercepted route)
  /dossiers/[id]         → Full dossier page ("2× scrolls")
/info/
  /info/about            About NMA
  /info/system           How the site works (models + dossiers explained)
  /info/manifesto        Manifesto
  /info/faq              FAQ
  /info/contact          Contact
/admin                   Login-gated CMS (Jonas + Ale)
```

Search lives **on the landing page** — one search across models + dossiers. Global search across all pages: **TBD** (listed as open question in brainstorm, keep deferred for now).

---

## Page specs

### 1. Landing Page — `/`

The primary view. Two switchable modes.

#### Grid view (default)

A variable-size grid. Each model card has a **size preset** stored in Firestore:

| Preset | Behaviour |
|---|---|
| `S` | 1 column |
| `M` | 1 column, taller |
| `L` | 2 columns |
| `Bi` | 2 columns, extra height (double portrait) |

Cards show: starred/hero photo, model number, importance level indicator.

**Grid zoom** — three named levels accessible via a control (or scroll-wheel):
- `1:10` — large cards, ~3 columns, image + title + maker
- `1:100` — medium, ~5 columns, image + number only
- `1:10,000` — miniature, ~10 columns, image only (thumbnail survey)

**Sorting sidebar** (right edge, collapsed by default):
- By importance (1 → 3)
- By date added
- By theme tag

**Group modes** (toggle):
- By cluster (related models visually grouped)
- By colour (future — defer to v2)

**"Help Me Search"** button: jumps to a random model, opens its drawer.

#### Constellation view

Toggled from the same landing page. A scrollable, zoomable canvas where models float in spatial clusters.

- Each node is an image card positioned absolutely
- Zoom in/out (pinch or scroll), pan by drag
- Models loosely clustered by tag/theme (layout computed once on load, stored in Firestore or derived client-side)
- **Pin** a model: fixes it in place on canvas
- **Smart Link** (ⓘ button on hover): shows a popover listing related dossiers
- Clicking any model → opens Drawer (same as grid)

**Implementation**: D3 force-directed layout, rendered as HTML elements (not canvas), so hover/click states work naturally. Positions computed once per session.

---

### 2. Model Drawer — `/models/[id]`

Opens as a slide-in panel over the landing page. URL updates. Direct URL access works as a full page.

**Implementation**: Next.js parallel routes (`src/app/@modal/(.)models/[id]/page.tsx`). The grid stays visible and dimmed behind the drawer. ESC or clicking outside closes it.

**Drawer contents** (top to bottom):
1. **Starred/hero photo** — full width at top
2. **Photo viewer** — click left/right to cycle; Big/Small size toggle (landscape fill vs portrait contained)
3. **Scale reference** — #10 numbers rendered graphically alongside the model
4. **Importance indicator** — 1 / 2 / 3 shown as a visual mark (not just metadata)
5. **Intro text** — short description / notes
6. **Tags** — clickable; clicking a tag filters the landing grid
7. **Related dossiers** — "This model appears in:" → links to dossier pages

---

### 3. Dossier Page — `/dossiers/[id]`

Scrollable editorial layout. Feels like a journal or a story.

**Structure**:
```
┌─────────────────────────────────┐
│  PINNED INTRO BLOCK             │  ← Always visible at top, click to expand fully
│  (expandable)                   │
├─────────────────────────────────┤
│  Content Block 1 (text)         │  ← Curated text with expand/cutoff toggle
│  Content Block 2 (image — L)    │  ← Variable size
│  Content Block 3 (image — Full) │
│  Content Block 4 (text)         │
│  ...                            │
└─────────────────────────────────┘
```

**Content block types**:
- `TextBlock`: body text with expand/collapse (shows first ~3 lines, rest hidden behind "Read more")
- `ImageBlock`: image with size (S / M / L / Full-width); supports **Maximise** (full screen) and **Compare** (side-by-side with another image)

**"2× scrolls"** behaviour: the page itself scrolls, AND within certain blocks there is inner scroll (e.g. a text block with more content than its allotted space).

**Typography**: font treated as an object — large, weighted. Text feels physical, not digital.

**Ordering**: entirely manual, curated by Jonas/Ale via the admin.

---

### 4. Info Section — `/info/*`

Five static pages (can be MDX or Firestore-backed — start static, migrate if needed):

- **About** — who NMA is and the workshop context
- **System** — how the site works: what a model is, what a dossier is, how to navigate
- **Manifesto** — editorial statement
- **FAQ** — practical questions
- **Contact** — form or email link

---

### 5. Admin — `/admin`

Login-gated CMS for Jonas + Ale.

Collections to manage:
- **Models** — all model metadata, photo upload (with importance per photo + star designation), tags, gridSize
- **Dossiers** — title, intro, block editor (add/reorder/delete text+image blocks, link models)
- **Info pages** — editable content for the 5 info pages (if Firestore-backed)

---

## Navigation

**Always hidden/collapsed**. A small mark (NMA / NET(WORK)) is the only persistent element.

On hover or click: the nav expands to reveal:
- The Collection (landing/grid)
- Dossiers
- Info
- [Admin — only if authenticated]

The branding toggles between **NMA** (short mark) and **NET(WORK)** (wordmark) — the sketchbook shows both as valid states.

---

## Data model

### `ma_models` — updated schema

New/changed fields vs current:

```typescript
// New fields to add
images: {
  url: string;           // Firebase Storage download URL
  importance: 1 | 2 | 3; // Controls layout weight
  isStarred: boolean;    // Hero photo shown in grids + top of drawer
  caption?: string;
}[]

tags: string[]           // Already exists but formalise as string[]
gridSize: 'S' | 'M' | 'L' | 'Bi'   // Controls card size on landing grid
canvasPosition?: { x: number; y: number }  // Saved position in constellation view
```

### `ma_dossiers` — new collection

```typescript
{
  id: string;            // doc ID
  title: string;
  slug: string;          // URL path segment
  intro: string;         // Pinned intro text
  coverImage: string;    // Firebase Storage URL — shown in dossier list
  isVisible: boolean;
  models: {
    modelId: string;
    order: number;
  }[]
  blocks: ContentBlock[]  // Ordered array of content blocks
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

type ContentBlock =
  | { type: 'text';  id: string; content: string; }
  | { type: 'image'; id: string; url: string; size: 'S' | 'M' | 'L' | 'Full'; caption?: string; }
```

### Firebase Storage — updated structure

```
models/
  images/[modelId]/     ← model photos (multiple per model)
  audio/                ← voice narratives
dossiers/
  images/               ← dossier cover images + editorial images
info/
  images/               ← images used in info pages
```

---

## Component inventory

| Component | Route/Location | Notes |
|---|---|---|
| `<Nav>` | All pages (layout) | Always collapsed, hover/click reveal, NMA / NET(WORK) mark |
| `<LandingGrid>` | `/` | Variable-size grid, zoom levels, sorting |
| `<GridCard>` | `/` | Model card with starred photo, size-responsive |
| `<ConstellationCanvas>` | `/` | D3 force layout, zoomable/pannable |
| `<ConstellationNode>` | `/` | Individual model node on canvas |
| `<SmartLinkPopover>` | `/` (constellation) | ⓘ → related dossiers |
| `<DrawerModal>` | `/@modal/models/[id]` | Slide-in panel, parallel route |
| `<PhotoViewer>` | Drawer | Click-cycle, Big/Small toggle |
| `<ScaleNumbers>` | Drawer | #10 numbers rendered graphically |
| `<DossierPage>` | `/dossiers/[id]` | 2× scroll editorial layout |
| `<PinnedIntroBlock>` | Dossier | Expandable pinned header block |
| `<TextBlock>` | Dossier | Expand/collapse body text |
| `<ImageBlock>` | Dossier | Variable size, maximise, side-by-side compare |
| `<BlockEditor>` | Admin | Add/reorder/delete content blocks for dossiers |
| `<ImageImportanceUploader>` | Admin | Upload photos + set importance + star designation |

---

## Build phases

### Phase 1 — Foundation *(do first, everything else depends on it)*

**Goal**: images appear, nav exists, data model is correct.

1. **Firebase Storage** — export `storage` from `firebase.ts`, wire starred photos to archive cards + model detail
2. **Updated image schema** — migrate `images: string[]` to `images: {url, importance, isStarred}[]` in CMS + Firestore
3. **Global `<Nav>`** — collapsed NMA mark, hover/click reveal, links to all sections
4. **`gridSize` field** — add to models schema + CMS

*Deliverable: the archive grid shows real photos. Navigation works across all pages.*

---

### Phase 2 — Landing page + Model drawer

**Goal**: the core experience of browsing and opening models works.

5. **Landing grid** — variable card sizes from `gridSize`, starred photo in each card
6. **Grid zoom** — three levels (1:10 / 1:100 / 1:10,000) via control + CSS scale
7. **Model drawer** — Next.js parallel routes, slide-in animation, photo viewer with Big/Small toggle
8. **Tags** — displayed on drawer, clicking a tag filters the landing grid
9. **"Help Me Search"** — random model button

*Deliverable: full browse + discover flow. Landing → hover card → click → drawer → see photos + metadata → close → back to grid.*

---

### Phase 3 — Dossiers

**Goal**: the second content type exists end-to-end.

10. **`ma_dossiers` Firestore collection** — set up schema
11. **Dossier page** — pinned intro, content block renderer (TextBlock + ImageBlock)
12. **Image maximise + compare** — lightbox + side-by-side view
13. **Dossier CMS editor** — block editor (add/reorder/delete), model picker
14. **Related dossiers** — shown on model drawer ("Appears in")
15. **Dossiers in nav + landing** — dossier search/browse entry point

*Deliverable: Ale can build a dossier in the CMS. Jonas can view it on the site.*

---

### Phase 4 — Constellation view

**Goal**: the spatial/discovery view works.

16. **D3 force layout** — cluster models by tag, render as HTML nodes
17. **Zoom + pan** — D3 zoom behaviour
18. **Pin + move** — drag nodes to reposition, pin to lock
19. **Smart Links** — ⓘ hover popover showing related dossiers
20. **Grid ↔ Constellation toggle** — smooth transition on landing page

*Deliverable: users can explore the collection spatially.*

---

### Phase 5 — Info section + polish

**Goal**: the site is complete enough to share publicly.

21. **Info pages** — About, System, Manifesto, FAQ, Contact (static MDX)
22. **Sorting sidebar** — importance / date / tag sorting on landing grid
23. **Group by cluster** — cluster-mode grid layout
24. **Mobile** — drawer becomes bottom sheet, grid collapses to 1–2 col, tap to cycle photos
25. **Animations** — drawer slide-in, nav reveal, block expand/collapse, zoom transitions
26. **Scale #10 numbers** — rendered graphically on model drawer

---

## Open questions (carry forward)

| Question | Status |
|---|---|
| Global search across all pages? | **Deferred** — landing page search covers models + dossiers for now |
| 3D scan per model? | **Deferred to v2** |
| Support / Donate page? | **Deferred** — noted in brainstorm as "Donate?" question mark |
| Final model count: 19 or 22? | **Decide with Ale** — doesn't block architecture |
| Colour clustering on landing? | **Deferred to v2** |
| Share/social upload version? | **Out of scope v1** — confirmed in brainstorm |

---

## Out of scope (v1)

- Social / community upload version
- User accounts (except admin)
- Algorithmic recommendation or sorting
- 3D scan viewer
- Colour-based clustering
- Any payment / support flow

---

*Last updated: 27.05.26*
