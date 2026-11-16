# Santa Claude 🎁

Family Christmas lists. Everyone adds what they'd like to their own list until the **lock date**. On that date lists lock, everyone else can see them, and shopping starts: claim an item so nobody doubles up, then mark it bought.

## How it works

- **Before the lock date:** you can only see and edit your own list (and any lists you manage). Other lists show "Opens Dec 1".
- **After the lock date:** your list is read-only, and you **never see** what's been claimed or bought on it. Everyone else's lists open for shopping.
- **Claiming:** tap an item, then "I'll get this". Others see it as "Claimed · Ben". Then "Mark bought", or "Unclaim" to let it go. The 🛒 Shopping tab lists everything you've claimed, with an estimated total.
- **Items** have a name, link, notes, a ★ "really want this" flag, and optional price, quantity, size, color and a photo. Shoppers can filter by available/mine and by price.
- **Family tab:** everyone in the group, with a custom label under each name (e.g. "Mom", "Ben's sister").
- **Managed lists:** for kids or anyone without a phone. Whoever adds one edits it before the lock and shops it after.
- **Sign-in:** tap your name and the phone remembers you. A 4-digit PIN is optional (Settings), and an organizer can remove a forgotten one from the Family tab.
- **Organizers** (the person who set it up, plus anyone they promote) change the lock date, edit or remove people, and can clear all lists for next year.

The lock happens at midnight at the start of the lock date, in each phone's local time.

> Privacy is "no peeking" level, not real security: the data is in an open Firestore database, so someone determined and technical could read it. Fine for family, not for secrets.

## Tech

- Static site (no build step): Preact + htm, served from GitHub Pages.
- **Firebase Firestore** for live sync. Photos are shrunk on the phone and stored in Firestore docs, so there's no Firebase Storage or billing.
- Works offline from Firestore's local cache. Claiming needs a connection so two people can't claim the same thing.
- Without a Firebase config it runs in **demo mode** (localStorage, this device only). Add `?local` to the URL to force demo mode.

## Setup

1. [Firebase console](https://console.firebase.google.com) → **Add project** (e.g. `santa-claude`; Analytics not needed).
2. Build → **Firestore Database** → Create database → pick a location → start in **production mode**.
3. Firestore → **Rules** → paste in `firestore.rules` → Publish.
4. Project settings → Your apps → **Web** (`</>`) → register → copy the config values into `js/firebase-config.js`.
5. Push to `main`, then on GitHub: Settings → Pages → Deploy from branch → `main` / root.
6. Open https://benczerwin.github.io/santa_claude/, set up the group, and send the link to the family. On iPhone: Share → **Add to Home Screen**.

### Run locally

```bash
python3 -m http.server 8124
```

Then open http://localhost:8124.

## Files

| Path | What |
| --- | --- |
| `js/app.js` | All screens & UI |
| `js/model.js` | Lock date, permissions, PINs, links, formatting |
| `js/store*.js` | Firestore / local-demo backends |
| `js/photo.js` | On-device photo shrinking |
| `css/styles.css` | Styles |

### Data

| Collection | Doc |
| --- | --- |
| `settings/group` | `name`, `lockDate` (YYYY-MM-DD), `admins` |
| `people/{id}` | `name`, `label`, `avatar`, `pinHash` (or null), `managedBy` (or null) |
| `items/{id}` | `ownerId`, `title`, `link`, `notes`, `priority`, `price`, `qty`, `size`, `color`, `thumb` |
| `claims/{itemId}` | `claimerId`, `ownerId`, `status` (`claimed` / `bought`) |
| `photos/{itemId}` | `full` (JPEG data URL) |
