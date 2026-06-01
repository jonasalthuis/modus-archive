# Content & URLs — Reference

How records are identified, how URLs are formed, what "published" means, and the full field list
for each collection.

---

## 1. Identifiers and URLs

Everything in the archive is addressable by a clean, permanent URL.

| Type | URL pattern | Example | ID source |
|---|---|---|---|
| **Model** | `/models/{number}` | `/models/0071` | The 4-digit reference number (also the document ID) |
| **Artefact** | `/artefacts/{slug}` | `/artefacts/preserving-analog-history` | An auto-generated slug (also the document ID) |
| **Dossier** | `/dossiers/{slug}` | `/dossiers/rogers-housing-1980s` | An auto-generated slug (also the document ID) |
| **Archive grid** | `/archive` | — | (collection browser) |
| **Lists** | `/artefacts`, `/dossiers` | — | (index pages) |

There is **no language prefix** in the URLs (no `/en/…`). Paths are flat and clean.

### The golden rule: the 4-digit number is the model's identity

A model's **4-digit reference number is its single source of truth**. It is:

- the **document ID** in the database,
- the **folder name** for its photos in storage (`models/images/0071/…`),
- the **URL** (`/models/0071`),
- the key that **dossiers and image links** use to point back to a model.

Because so much hangs off it, the number is **permanent** and cannot be edited after a model is
created. If a number is wrong, create a new record and delete the old one.

### Slugs (artefacts & dossiers)

- A **slug** is the URL-friendly, hyphen-separated name (e.g. `preserving-analog-history`).
- It is **auto-generated from the title** as you type, and you can tweak it before the first save.
- After creation it is **locked** — it's the page's permanent address (the document ID), shown but
  read-only in the editor.
- Saving a new record whose slug already exists is **blocked** with a warning, so you never
  silently overwrite an existing page.

> Why slugs for artefacts/dossiers but numbers for models? Models are catalogue objects with a real
> physical reference number. Artefacts and dossiers are editorial content meant to be read and
> shared, so a readable URL (`/artefacts/the-craft-of-basswood`) is far more useful than a number.

---

## 2. "Published" vs "Prototype"

Two independent flags control models. Don't confuse them.

| Flag | Field | Controls |
|---|---|---|
| **Published** | `isVisible` | Whether the record appears on the **public site** at all. Off = hidden from everyone except staff. |
| **Prototype** | `inPrototype` | Whether the model is part of the **current launch/demo subset**. Used for curation and the dashboard readiness counts. Does **not** by itself make something public. |

Artefacts and dossiers have **Published** (`isVisible`) only.

To make something live on the site, turn **Published** on. The public pages and lists only ever
show published records to non-staff visitors.

---

## 3. Images and audio

- Photos and audio live in **Firebase Storage**, organised by the model number:
  - `models/images/{modelNumber}/…` — model photographs
  - `models/audio/{modelNumber}/…` — voice narratives
  - `articles/images/…` — artefact hero images
- The database stores the **download URL**, so images/audio are used directly on the pages.
- **Hero image:** in a model's gallery you can **star** one image; that becomes the main image on
  the model page and the thumbnail in the archive grid. If none is starred, the first image is used.
- **Captions, importance, and order** can be set per image in the gallery editor.
- A model's **voice narrative** appears as an audio player on its public page.

---

## 4. Collection field reference

### Models (`ma_models`) — public path `/models/{number}`

| Field | Type | Notes |
|---|---|---|
| `modelNumber` | text | **The 4-digit reference. Document ID. Permanent.** |
| `title` | text | Project name and phase. |
| `architect` | text | |
| `year` | number | |
| `isVisible` | yes/no | **Published** — live on the public site. |
| `inPrototype` | yes/no | **Prototype** — part of the launch subset. |
| `images` | gallery | Photos (Storage URLs), with star/importance/caption. |
| `voiceNarrative` | audio | Voice recording (Storage URL). |
| `modelType` | choice | presentation / study / competition / urban / structural / detail / section / interior / fragment |
| `buildingType` | text | |
| `buildingStatus` | choice | built / unbuilt / competition / demolished / unknown |
| `scale` | text | e.g. `1:200` |
| `modelSize` | text | Physical dimensions. |
| `location` | text | |
| `leadMaker` / `otherMakers` | text | |
| `photographer` | text | Credited on the model page. |
| `provenance` | text | Current physical location. |
| `materials` | list | Comma-separated. |
| `tags` | list | Comma-separated. |
| `notes` | long text | Free-form description. |

### Artefacts (`ma_articles`) — public path `/artefacts/{slug}`

| Field | Type | Notes |
|---|---|---|
| `title` | text | Headline. |
| `slug` | text | **Auto from title. Document ID. Locked after creation.** |
| `author` | text | |
| `publishDate` | date | |
| `isVisible` | yes/no | **Published**. |
| `heroImage` | text | Storage URL for the lead image. |
| `excerpt` | long text | Short summary / standfirst. |
| `content` | long text | The body (paragraphs separated by blank lines). |
| `tags` | list | Comma-separated. |

### Dossiers (`ma_dossiers`) — public path `/dossiers/{slug}`

| Field | Type | Notes |
|---|---|---|
| `title` | text | |
| `slug` | text | **Auto from title. Document ID. Locked after creation.** |
| `isVisible` | yes/no | **Published**. |
| `coverImage` | text | Storage/image URL for the cover. |
| `intro` | long text | Introduction shown under the title. |
| `tags` | list | Comma-separated. |
| `items` | ordered list | The content blocks (managed only in the Dossier Editor): each is a **heading**, **text**, **artefact** link, or **model image**. |

### Users (`users`)

| Field | Type | Notes |
|---|---|---|
| `displayName` | text | |
| `email` | text | |
| `role` | choice | admin / editor / viewer — **enforced** in the UI and security rules. |

### Invites (`ma_invites`) — see [access-and-invites.md](./access-and-invites.md)

| Field | Type | Notes |
|---|---|---|
| `code` | text | `NMA-XXXX-XXXX`. |
| `label` | text | Your note about who it's for. |
| `expiresAt` | date | Auto-expiry. |
| `maxUses` | number / unlimited | Redemption limit. |
| `useCount` | number | Times redeemed. |
| `isRevoked` | yes/no | Manually killed. |

---

## 5. Practical tips

- **Linking a model from a dossier or artefact:** always use the 4-digit number. In the Dossier
  Editor's "Model image" picker, you enter the number and pick a photo — the link back to
  `/models/{number}` is created for you.
- **Sharing a page:** the URL is stable, so you can safely copy/paste `/models/0071` or
  `/artefacts/{slug}` into emails — they won't change as long as the record exists.
- **Don't reuse a number or slug** for a different subject — IDs are permanent and meant to point
  to one thing forever.
