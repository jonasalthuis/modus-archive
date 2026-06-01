# Admin Guide

How to use the NMA admin panel to manage models, artefacts, and dossiers.

---

## 1. Getting in

1. Go to **`/admin`** (e.g. `yourdomain.com/admin`).
2. Sign in with either:
   - **Continue with Google** — use an authorised staff Google account, or
   - **Email + password** — for staff accounts set up with a password.
3. You land on the **Dashboard**.

> Guest access codes do **not** work here. The admin panel is staff-only. If you sign in with a
> guest code you'll see a "Restricted" message instead of the panel.

To leave the admin panel, use **Exit to site** (top-right) or click **Admin** under the NMA logo —
both take you back to the public site.

---

## 2. The layout

- **Left sidebar** — navigation:
  - **Dashboard** — status overview and live web analytics.
  - **Collections**: Models, Artefacts, Dossiers, Users.
  - **Access**: Invites (guest codes).
  - **New model** button (bottom) — the fast path to add a model with photos.
  - **Account** and **Sign out** (very bottom).
- **Main area** — whatever you've selected. Tables, editors, and the dashboard appear here.

---

## 3. The Dashboard

The dashboard shows:

- **Models** — total in the database, how many are flagged Prototype, how many are Published, and how many have images.
- **Content** — counts of Artefacts and Dossiers.
- **Web Analytics** — a live 7-day rolling view: page views, sessions, users, average visit
  duration, a daily bar chart, top pages, and a "X active now" live count. It refreshes itself
  every 60 seconds, or hit the refresh icon. (If it shows a permissions error, the analytics API
  access needs to be re-checked — that's a technical setup item, not a content issue.)

Clicking any stat card jumps to the relevant collection.

---

## 4. Working with the data tables

Every collection (Models, Artefacts, Dossiers, Users) uses the same powerful table:

- **Search all columns** — free-text search box.
- **Columns** — toggle which columns are visible (e.g. show "Materials" or "Photographer").
- **Per page** — 25 / 50 / 100 rows.
- **Sorting** — click a column header.
- **Resizing** — drag the edge of a column header.
- **Quick filters** (Models only) — one-click chips: **Prototype**, **Published**, **With images**, **No images**.

**Click any row to open it for editing.**

---

## 5. Adding a model (with photos) — the fast way

Use the **New model** button in the sidebar. This opens a dedicated panel built for speed:

1. **Enter the model number** (the 4-digit reference, e.g. `0071`). This is the most important
   field — it becomes the model's permanent ID and the folder name where its photos are stored.
   You can type `71` and it will be treated as the reference; keep it consistent with the
   collection's numbering.
2. **Drag and drop photos** straight onto the panel (or click to pick files). Images upload to
   Firebase Storage automatically. They are filed under `models/images/{modelNumber}/…`, so the
   4-digit number ties the photos to the record.
3. Fill in the **title** and any other details you have.
4. **Save.** The record is written to the database with its images already attached.

> Photos start uploading as soon as a model number is present. If you drop photos before typing
> the number, they queue and upload the moment you enter it.

---

## 6. Editing a model (full detail)

Open **Models** and click a row. A side panel slides in with every field.

- **Toggle Published** to control whether it appears on the public site.
- **Toggle Prototype** to include/exclude it from the launch subset.
- **Audio** — upload a voice narrative; it appears as an audio player on the model's public page.
- **Materials / Tags** — comma-separated (e.g. `Wood, Steel, Acrylic`).

### Organising a model's images

You upload images first, then arrange them into these categories — all in the model editor:

- **Featured (main + secondary)** — two prominent lead images. **Main** is shown largest and first
  on the model page; **Secondary** is a supporting feature image (optional). Upload one into each slot.
- **Image groups** — add as many as you like, each with a type:
  - **Gallery (click-through lightbox)** — one card; clicking it opens a full-screen, click-through
    viewer. Put any number of images in it.
  - **Side by side (2–3 images)** — two or three images shown together. Toggle the layout between
    **Next to** (a row) and **Above / below** (a column).
  - **Single photo** — one standalone image.
- **Images (legacy)** — the older flat gallery (star = hero). Still works; new work should use
  Featured + Image groups.

Everything you set here renders on the public model page automatically.

### Save & discard safeguards

The editor protects your work:

- The **Save changes** button at the bottom is greyed out until you actually change something.
- When you click Save, a **confirmation popup** asks you to confirm the information is accurate
  before it writes to the database.
- If you try to **close the panel (X, Cancel, or clicking outside) with unsaved changes**, you get
  a **"Discard changes?"** warning. You can keep editing or discard.
- An amber **"Unsaved"** badge appears in the panel header whenever you have pending changes.
- Use the **fullscreen** toggle (top-right of the panel) for a roomier editing view.

> **The model number / slug cannot be changed after creation.** It's the permanent record ID.
> The field is shown but locked when editing. If a number is genuinely wrong, create a new record
> and delete the old one.

### Deleting

The **Delete permanently** button is at the bottom-left of the editor (edit mode only). It cannot
be undone, so it asks for confirmation.

---

## 7. Artefacts (texts & writings)

Artefacts are written content — essays, notes, interview transcripts.

1. Go to **Artefacts** → **Add new** (or click a row to edit).
2. Fill in:
   - **Title** — the headline.
   - **Slug** — **auto-fills from the title** as you type (e.g. "Preserving Analog History" →
     `preserving-analog-history`). You can customise it before the first save. It becomes the
     permanent URL: `/artefacts/preserving-analog-history`.
   - **Author**, **Date**, **Hero image** (a Storage URL), **Excerpt**, **Content** (the body text),
     **Tags**.
   - **Published** — toggle on to make it live.
3. Save (with the same confirmation safeguard as models).

> Once created, the slug is **locked** — it's the page's permanent address. See
> [content-and-urls.md](./content-and-urls.md) for details.

---

## 8. Dossiers (curated thematic pages)

A dossier is a "pinboard" — a long, ordered list of headings, text, linked artefacts, and model
images grouped around a theme.

Click **Dossiers** → click a row, or **Add new**. This opens the **full-screen Dossier Editor**:

- **Left side — the editor.**
  - **Metadata** at the top: Title, Slug (auto-filled from title, then locked after creation),
    Intro, Tags, Cover image, and a Published toggle.
  - **Items** below: the content blocks, in order.
- **Right side — a live preview** of exactly how the dossier page will look.

### Adding items

Use the **Add item** buttons at the bottom-left:

- **Heading** — a section title.
- **Text block** — a paragraph of writing.
- **Artefact** — opens a picker to search your artefacts; inserts a linked card.
- **Model image** — opens a picker: type a model number, see its uploaded photos, and click one
  to insert. The image stays linked to that model (visitors can click through to it).

### Reordering

Each item has a **drag handle** (the grip icon on the left). Drag items up or down to reorder —
the preview updates live.

### Saving

Use **Save** (top-right). You'll get a confirmation popup. The **Live / Draft** badge shows the
current published state. If you try to leave with unsaved changes, you'll be warned.

---

## 9. Users

The **Users** collection (`users`) lists accounts with a **role** (admin / editor / viewer),
keyed by email. Roles are **enforced** both in the admin UI and in the database security rules:

- **admin** — full access incl. Dashboard, Users, Invites.
- **editor** — content collections + Guides only.
- **viewer** — frontend only (no admin).

Add a teammate: **Users → Add new**, enter their email (the permanent record ID — must match the
email they sign in with), name, and role. See **Access & Invites** for the full model.

---

## 10. Common questions

**Q: I changed a field but Save is greyed out.**
Save only activates after a real change. If it's grey, no change was registered — try editing the field again.

**Q: My photos won't upload.**
Make sure the model number is filled in first — uploads are keyed to it. Check your connection;
failed uploads show an error and can be retried.

**Q: A model/artefact isn't showing on the public site.**
Check the **Published** toggle is on. For models, also confirm it's the record you expect (search
by number). Newly published content appears immediately.

**Q: Can I rename a slug or model number later?**
No — they're permanent IDs. Create a new record and delete the old one if you must change it.

**Q: How do I let a guest see the site without giving them a staff account?**
Use **Invites** — see [access-and-invites.md](./access-and-invites.md).
