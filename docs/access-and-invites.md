# Access & Invites

How the site is locked down, how staff get in, and how to give guests temporary access.

---

## 1. The whole site is private

The NMA site is **not public**. Every visitor — including on the homepage — must get past a
login gate before they see any content. There are two ways through:

1. **Staff login** — for accounts that have been pre-authorised with a role (see below).
2. **Guest access code** — a temporary code you generate and send to someone (view-only access
   to the published archive; **no** admin access).

This is enforced both in the interface (a gate wraps the entire site) and in the database security
rules (guests can only read content that is marked visible).

---

## 1a. Roles & accounts

Accounts are **invite-only**: someone can only sign in if an **admin has already added their email**
in the **Users** collection with a role. A Google sign-in for an email that isn't listed is turned
away ("Not authorised").

| Role | Admin panel | Frontend |
|---|---|---|
| **admin** | Everything, incl. Dashboard, Users, and Invites | ✓ |
| **editor** | Content collections (Models / Artefacts / Dossiers) + Guides — no Dashboard, Users, or Invites | ✓ |
| **viewer** | None (sent to the frontend) | ✓ |
| **guest** *(invite code)* | None | ✓ published content, temporary |

How to add a teammate:

1. Go to **Users** → **Add new**.
2. Enter their **email** (this becomes the record ID and must match the email they log in with),
   their name, and a **role**. Save.
3. They can now sign in with Google using that email and will get the assigned role.

Notes:
- The **email is the permanent record ID** — to change someone's email, delete and re-add them.
- Each person can see their own access level on the frontend **Account** page (`/account`).
- The project owner is hard-wired as an admin in code + rules, so you can never lock yourself out.
- Roles are enforced by the Firestore security rules (the real lock), not just the UI.

---

## 2. Staff login

On the access screen, choose the **Staff login** tab:

- **Continue with Google** — the quickest route. The account must be on the authorised list.
- **Email + password** — for accounts created with a password.

Staff sessions can do everything: browse the site and open `/admin`.

> **When you connect a real domain**, you must add it to the authorised list in
> **Firebase Console → Authentication → Settings → Authorised domains**, otherwise Google login
> will fail with an "unauthorised domain" error on the new domain.

---

## 3. Guest access codes (invites)

Guest codes let you share the archive with someone — a funder, a collaborator, an interviewee —
without creating a full account for them. They sign in **anonymously** behind the scenes and get
read-only access to whatever is published.

### Generating a code

1. In the admin panel, go to **Invites** (under *Access* in the sidebar).
2. Fill in the **create** form:
   - **Label** — a note to yourself about who it's for (e.g. "EFL Stichting — Marieke"). This is
     just for your reference.
   - **Expiry** — how long it stays valid: 1, 3, 7, 30, or 90 days.
   - **Max uses** — how many times it can be redeemed: 1, 3, 5, 10, or unlimited.
3. A code is created in the format **`NMA-XXXX-XXXX`** (using only unambiguous characters — no
   `0`/`O` or `1`/`I`/`L` confusion).

### Sharing a code

Each code row has two copy buttons:

- **Copy link** — copies a full URL like `yourdomain.com/?code=NMA-AB3K-9F2P`. The recipient just
  clicks it and is **admitted automatically** (the code is read from the URL and submitted for them).
  This is the easiest option to send by email.
- **Copy code** — copies just the `NMA-XXXX-XXXX` code, for when you want them to type it on the
  access screen's **Access code** tab.

### What the guest experiences

- They open the link (or enter the code on the **Access code** tab).
- The code is validated, and they're signed in as an anonymous guest.
- They can browse the published archive. They **cannot** reach `/admin`.

### Managing codes

The Invites table shows each code with its label, expiry, use count, and a **status** badge:

| Status | Meaning |
|---|---|
| **Active** | Valid and usable. |
| **Expired** | Past its expiry date. |
| **Exhausted** | Hit its max-uses limit. |
| **Revoked** | Manually disabled. |

- **Revoke** a code at any time to kill it immediately (e.g. if a link leaked). This can't be undone.
- Expired/exhausted/revoked codes stop working automatically — no action needed.

---

## 4. How validation works (the safeguards)

When a code is entered, the system checks, in order:

1. The code exists → otherwise "Invalid access code."
2. It hasn't been revoked → otherwise "This access code has been revoked."
3. It hasn't expired → otherwise "This access code has expired."
4. It hasn't hit its max-uses limit → otherwise "…used the maximum number of times."

Only if all pass does it admit the guest and increment the use count.

---

## 5. Security model in brief

- **Published content** (models, artefacts, dossiers marked visible) is readable by any signed-in
  visitor, including anonymous guests.
- **Unpublished content** is only readable by staff accounts.
- **Writing** anything (creating/editing records) requires a staff account.
- **Invite codes** are publicly readable by design — they have to be checked *before* sign-in —
  but only staff can create or revoke them.

> Practical implication: don't treat an unredeemed invite code as a secret beyond its purpose.
> Its power is limited to "view the published archive," it expires, and you can revoke it instantly.
