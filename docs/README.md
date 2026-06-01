# NMA — Documentation

User guides for the **Network Modelmakers Archive** (NMA) — the private digital archive
of architectural scale models made by Network Modelmakers (London, 1978–2014).

These documents explain how the live system works today and how to use it day to day.
They are written for the people running the archive (Jonas + Alessandro), not just developers.

## Guides

| Document | What it covers |
|---|---|
| [**admin-guide.md**](./admin-guide.md) | Using the admin panel: dashboard, adding & editing models, images, audio, artefacts, dossiers, and the save/discard safeguards. **Start here for content work.** |
| [**access-and-invites.md**](./access-and-invites.md) | How the whole site is locked behind a login, how staff sign in, and how to generate, share, and revoke guest access codes. |
| [**content-and-urls.md**](./content-and-urls.md) | Reference: how records are identified, how URLs and slugs work, the difference between "published" and "prototype", and the full field list for each collection. |

## The 30-second overview

- The public site lives at the root (e.g. `yourdomain.com`) and is **completely private** —
  every visitor must either log in as staff or enter a guest access code.
- The **admin panel** is at `/admin`. Only staff accounts (Google or email/password) can use it.
- Content is organised into three collections:
  - **Models** — the ~850 architectural scale models. Each has a 4-digit reference number.
  - **Artefacts** — texts, essays, and writings about the archive.
  - **Dossiers** — curated thematic collections that pull together models, artefacts, and images.
- Everything is stored in Firebase (Firestore database + Storage for images/audio).
- Each model's **4-digit number is its permanent ID** and the key everything else references.

## A note on terminology

| Word | Meaning |
|---|---|
| **Model** | A physical architectural scale model in the collection. |
| **Artefact** | A piece of written content (essay, note, interview text). |
| **Dossier** | A curated "pinboard" page linking models, artefacts, images around a theme. |
| **Prototype** | A model flagged for inclusion in the current launch/demo subset. |
| **Published / Visible** | A record that is live and viewable on the public site. |
| **Invite / Access code** | A `NMA-XXXX-XXXX` code that lets a guest into the private site. |
