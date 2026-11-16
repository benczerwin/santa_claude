# Santa Claude 🎁

Family Christmas lists. Everyone adds what they'd like to their own list until the **lock date**. On that date lists lock, everyone else can see them, and shopping starts: claim an item so nobody doubles up, then mark it bought.

## How it works

- **Before the lock date:** you can only see and edit your own list (and any lists you manage). Other lists show "Opens Dec 1".
- **After the lock date:** your list is read-only, and you **never see** what's been claimed or bought on it. Everyone else's lists open for shopping.
- **Claiming:** tap an item, then "I'll get this". Others see it as "Claimed · Ben". Then "Mark bought", or "Unclaim" to let it go. The 🛒 Shopping tab lists everything you've claimed, with an estimated total.
- **Items** have a name, a primary link plus any extra links, notes, a ★ "really want this" flag, and optional price, quantity, size, color and a photo. Shoppers can filter by available/mine and by price.
- **Family tab:** everyone in the group, with their Stocking Theme.
- **Christmas years:** each year has its own lists, lock date and claims. Pick the year at the top of Home; each phone remembers the last one you viewed. Organizers start a new year in Settings.
- **Paste links:** on your list, "Paste links from Amazon or other stores" turns pasted product links into items, naming them from the link where possible.
- **Swipe & drag:** on your list, swipe right to edit, left to delete, and drag the handle to reorder. When shopping, swipe right to claim / mark bought, left to unclaim.
- **Sample family (demo mode only):** Settings → "Load sample family" fills in made-up people, items and claims (this year and last) to try things out. It replaces everything saved, so it is hidden once Firebase is connected.
- **Managed lists:** for kids or anyone without a phone. Whoever adds one edits it before the lock and shops it after.
- **Sign-in:** tap your name (or "I'm new, sign me up") and the phone remembers you. "Not you?" on Home switches person.
- **Organizers** (the person who set it up, plus anyone they promote) change the lock date, edit or remove people, and start or delete years.

The lock happens at midnight at the start of the lock date, in each phone's local time.

> Privacy is "no peeking" level, not real security: the data is in an open Firestore database, so someone determined and technical could read it. Fine for family, not for secrets.

## Tech

- Static site (no build step): Preact + htm, served from GitHub Pages.
- **Firebase Firestore** for live sync. Photos are shrunk on the phone and stored in Firestore docs, so there's no Firebase Storage or billing.
- Works offline from Firestore's local cache. Claiming needs a connection so two people can't claim the same thing.
- Without a Firebase config it runs in **demo mode** (localStorage, this device only). Add `?local` to the URL to force demo mode.

## Setup

Already done for this repo: Firebase project `santa-claude-08zuk` (Firestore in `nam5`), config in `js/firebase-config.js`, rules deployed. To redeploy rules after editing `firestore.rules`:

```bash
npx firebase-tools deploy --only firestore:rules
```

From scratch:


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
| `js/model.js` | Lock date, years, permissions, links, formatting |
| `js/icons.js` | SVG line icons |
| `js/sample.js` | Sample family data |
| `js/store*.js` | Firestore / local-demo backends |
| `js/photo.js` | On-device photo shrinking |
| `css/styles.css` | Styles |

### Data

| Collection | Doc |
| --- | --- |
| `settings/group` | `name`, `admins`, `years: { '2026': { lockDate } }` |
| `people/{id}` | `name`, `label` (Stocking Theme), `avatar`, `managedBy` (or null) |
| `items/{id}` | `ownerId`, `year`, `order`, `title`, `link` (primary), `links` (others), `notes`, `priority`, `price`, `qty`, `size`, `color`, `thumb` |
| `claims/{itemId}` | `claimerId`, `ownerId`, `year`, `status` (`claimed` / `bought`) |
| `photos/{itemId}` | `full` (JPEG data URL) |
