# NMA Archive Platform — Site Spec
*Brainstorm date: 29.03.26*

---

## Concept

**MODUS** is a curated archive website for NMA. It presents a collection of architectural/design models organised into two content types: **Models** (individual items) and **Dossiers** (themed collections of models). The feeling is like opening a physical cabinet — tactile, slow, and discovery-driven. Aesthetic references: scrapbook, scanned documents, physical archive.

URL pattern: `modus.com/models/071/`

---

## Content Structure

### Models
- ~50 models in prototype version
- Each model has ~5 photos, a short intro text, a scale reference (#10 numbers), and optionally a 3D scan
- Each model image is assigned an **importance level: 1, 2, or 3** — this controls how prominently it appears in layouts (size, weight)
- Each model has a **starred/hero photo** shown in grids and at the top of its page
- Models are tagged with special tags (material, scale, theme, etc.)

### Dossiers
- ~20 dossiers, each containing some amount of models 
- A dossier is a curated, manually ordered collection with an editorial feel — "like a story you want to read"
- Each dossier has a pinned intro block, then a sequence of content blocks (text + images)
- Content is curated and ordered manually, not algorithmically

---

## Pages

### Landing Page
The primary view of the site. Shows all models in a browsable layout.

**Two main view modes (toggleable):**
- **Grid view** — models displayed in a grid; columns have size presets (S, M, Large, Bi). Grid supports zoom (scale range: 1:10 → 1:100 → 1:10,000). Models can be shown grouped by cluster or by colour.
- **Constellation view** — a scrollable, zoomable canvas where models float in spatial clusters. Supports zoom in/out, panning, pinning items, moving items, and "Smart Links" (an ⓘ button that shows related dossiers).

**Sidebar:** sorting controls (by importance, date added, theme tag).

**"Help Me Search"** — a random discovery button that jumps to a random model.

### Model Page (`/models/[id]/`)
Opens as a **"Drawer"** — slides in from the side rather than navigating to a new page.

Contains: starred photo, photo viewer (click between images, big/small size toggle), scale numbers, importance indicator, intro text, tags, and links to related dossiers.

### Dossier Page (`/dossiers/[id]/`)
Scrollable editorial layout ("2× scrolls" — blocks scroll within the page).

Structure: pinned expandable intro block at top → sequence of content blocks (text blocks with expand/cutoff, image blocks of varying sizes) → blocks are manually ordered. Supports maximise and side-by-side compare for images. Font treatment makes text feel like a physical object.

### Info / About Section
- **About** — who NMA is and the network context
- **How It Works / System** — explains the model/dossier structure and how to navigate
- **Manifesto**
- **FAQ**
- **Contact**
- **Support** *(possibly — TBD)*

### Admin Backend
Login-gated page for Jonas and Ale to manage collections (add/edit models and dossiers).

---

## Navigation

Menu is **always hidden/collapsed** by default. Revealed on hover or click. Branding mark: **NMA** / NET(WORK).

---

## Visual & Interaction Language

- Scrapbook / scanned aesthetic — images feel physical, not digital-clean
- Font is treated as an object (large, weighted, typographic presence)
- Importance 1/2/3 is expressed through layout size and visual prominence
- Mobile: feels like opening a drawer or cabinet; big/small image sizes; tap to cycle through photos
- Animations: drawer slide-in, menu reveal, block expand/collapse, grid zoom

---

## Open Questions (to decide during build)

- Global search across all pages — include?
- 3D scan integration — defer to v2?
- Support/Donate page — include in v1?
- Constellation view implementation — CSS/Webflow or JS canvas?
- Final model count: 19 or 22?

---

## Out of Scope (v1)

- Social / upload version (future)
- User accounts (except admin)
- Any algorithmic recommendation or sorting
