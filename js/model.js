// Pure rules for lists: lock date, who sees what, links, formatting.

export const AVATARS = [
  '🎅', '🤶', '🧑‍🎄', '🦌', '⛄', '🎄', '🍪', '🧦', '🔔', '⭐', '🎁', '🎀', '🕯️', '❄️', '🍭', '☕',
  '🐧', '🧸', '🐻‍❄️', '🦊', '🦉', '🐶', '🐱', '🐰', '🐻', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🦄',
  '🐢', '🐙', '🦖', '🐳', '🦋', '🐝', '🌻', '🌵', '🍄', '🌈', '🍕', '🧁', '🍩', '🍓', '🥑', '🌮',
  '🚀', '🎸', '🎹', '🎨', '📚', '🎮', '⚽', '🏀', '⛳', '🎣', '🏔️', '🏖️', '👑', '🤖', '👻', '🧙',
];

export const newId = (n = 12) => {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
};

// ── lock date ──

/** Lock moment = midnight at the start of lockDate, in the phone's local time. */
export const lockTime = (group) => (group?.lockDate ? new Date(`${group.lockDate}T00:00:00`).getTime() : Infinity);
export const isLocked = (group, now = Date.now()) => now >= lockTime(group);

export function fmtDate(isoDate, opts = { month: 'short', day: 'numeric' }) {
  if (!isoDate) return '';
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, opts);
}

/** "3 days", "5 hours", "12 minutes" until the lock. */
export function timeLeft(group, now = Date.now()) {
  const ms = lockTime(group) - now;
  if (!isFinite(ms) || ms <= 0) return '';
  const d = Math.floor(ms / 86_400_000);
  if (d >= 1) return `${d} day${d === 1 ? '' : 's'}`;
  const h = Math.floor(ms / 3_600_000);
  if (h >= 1) return `${h} hour${h === 1 ? '' : 's'}`;
  const m = Math.max(1, Math.floor(ms / 60_000));
  return `${m} minute${m === 1 ? '' : 's'}`;
}

/** Default lock date: Dec 1 this year, or next year's if that's already passed. */
export function defaultLockDate(now = new Date()) {
  const y = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  return `${y}-12-01`;
}

// ── permissions ──

export const isAdmin = (group, me) => !!me && (group?.admins || []).includes(me.id);

/** Lists this person can edit before the lock: their own plus any they manage. */
export const canEdit = (me, person) => !!me && !!person && (person.id === me.id || person.managedBy === me.id);

/**
 * How `me` sees `person`'s list:
 *  'edit'   – before lock, own or managed list: add/edit/delete items
 *  'hidden' – before lock, someone else's list: can't see items yet
 *  'owner'  – after lock, your own list: read-only, check-offs hidden (it's a surprise)
 *  'shop'   – after lock, anyone else's list (incl. lists you manage): claim & mark bought
 */
export function listMode(me, person, group, now = Date.now()) {
  if (!isLocked(group, now)) return canEdit(me, person) ? 'edit' : 'hidden';
  return person.id === me.id ? 'owner' : 'shop';
}

// ── items ──

/** "Really want" items pinned on top, then the owner's drag order; never-reordered items go last, oldest first. */
export function sortItems(items) {
  const key = (i) => (typeof i.order === 'number' ? [0, i.order] : [1, i.createdAt || 0]);
  return [...items].sort((a, b) => {
    const x = key(a), y = key(b);
    return (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || x[0] - y[0] || x[1] - y[1];
  });
}

export const nextOrder = (items) => items.reduce((m, i) => Math.max(m, typeof i.order === 'number' ? i.order + 1 : 0), 0);

/** Local YYYY-MM-DD, `days` from now. */
export function isoDate(days = 0, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function normalizeLink(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}

/** Every link on an item, primary first. Items store `link` (primary) + `links` (the rest). */
export const allLinks = (item) => (item ? [item.link, ...(item.links || [])].filter(Boolean) : []);

/** Editor rows -> { link, links }: drops blanks, invalid and duplicate links; first valid one is primary. */
export function splitLinks(rows) {
  const ok = [...new Set(rows.map(normalizeLink).filter(Boolean))];
  return { link: ok[0] || '', links: ok.slice(1) };
}

export function linkHost(href) {
  try { return new URL(normalizeLink(href)).hostname.replace(/^www\./, ''); } catch { return 'link'; }
}

export function fmtPrice(n) {
  if (n == null || n === '' || isNaN(n)) return '';
  const v = Number(n);
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function parsePrice(s) {
  const v = parseFloat(String(s ?? '').replace(/[^0-9.]/g, ''));
  return isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : null;
}

/** Short detail line: "$25 · Qty 2 · Size M · Blue" */
export function itemMeta(item) {
  return [
    fmtPrice(item.price),
    item.qty > 1 ? `Qty ${item.qty}` : '',
    item.size ? `Size ${item.size}` : '',
    item.color || '',
  ].filter(Boolean).join(' · ');
}

// ── Christmas years ──
// settings/group.years = { '2026': { lockDate: '2026-12-01' }, ... }. Older docs only had group.lockDate.

export function yearsOf(group) {
  if (group?.years && Object.keys(group.years).length) return group.years;
  const y = group?.lockDate?.slice(0, 4) || String(new Date().getFullYear());
  return { [y]: { lockDate: group?.lockDate || `${y}-12-01` } };
}

/** Newest first. */
export const yearList = (group) => Object.keys(yearsOf(group)).sort((a, b) => b.localeCompare(a));

/** Items/claims saved before years existed belong to the oldest year. */
export const yearOfDoc = (doc, group) => String(doc.year ?? yearList(group).at(-1));

/** The group as seen for one year: same fields, plus that year's lockDate. */
export const groupForYear = (group, year) => ({ ...group, year, lockDate: yearsOf(group)[year]?.lockDate });

// ── importing pasted links ──

const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());

function cleanSlug(seg) {
  let t = seg;
  try { t = decodeURIComponent(seg); } catch {}
  t = t.replace(/\.(html?|aspx?|php)$/i, '').replace(/[-_+]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (t.length > 90) t = `${t.slice(0, 90).replace(/\s+\S*$/, '')}…`;
  return t;
}

/**
 * Turns pasted text into item drafts: [{ title, link, key }] plus a list of warnings.
 * Amazon links keep the product name from the URL; tracking junk is dropped.
 */
export function parsePastedLinks(text) {
  const found = String(text).match(/(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|co|net|org|ca|co\.uk|de)\/)[^\s<>"']+/gi) || [];
  const out = [];
  const warnings = [];
  const seen = new Set();
  for (const raw of found) {
    const href = normalizeLink(raw.replace(/[),.;!?]+$/, ''));
    if (!href) continue;
    const u = new URL(href);
    const host = u.hostname.replace(/^www\.|^smile\./, '');
    let title = '', link = href, key = href;

    if (/(^|\.)amazon\.[a-z.]+$/.test(host)) {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.some((p) => /^(wishlist|registry)$/i.test(p)) || /\/hz\/wishlist\//i.test(u.pathname)) {
        warnings.push('One link is a whole Amazon list. Open it and copy each item\'s link instead.');
        continue;
      }
      const i = parts.findIndex((p) => p === 'dp' || p === 'product');
      const asin = i >= 0 ? parts[i + 1]?.slice(0, 10) : null;
      const slug = i > 0 && parts[i - 1] !== 'gp' ? parts[i - 1] : '';
      title = slug ? cleanSlug(slug) : asin ? `Amazon item ${asin}` : 'Amazon item';
      link = asin ? `https://www.${host}/${slug ? `${slug}/` : ''}dp/${asin}` : `${u.origin}${u.pathname}`;
      key = asin ? `amazon:${asin}` : link;
    } else if (host === 'a.co' || host === 'amzn.to' || host === 'amzn.com') {
      title = 'Amazon item';
    } else {
      const segs = u.pathname.split('/').filter((s) => s && !/^\d+$/.test(s) && !/^(p|dp|product|products|item|ip|s)$/i.test(s));
      const best = segs.filter((s) => /[a-z]/i.test(s) && /[-_+]/.test(s)).sort((a, b) => b.length - a.length)[0];
      title = best ? titleCase(cleanSlug(best).toLowerCase()) : `Item from ${host}`;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, link, key });
  }
  return { drafts: out, warnings: [...new Set(warnings)] };
}

/** Same key parsePastedLinks uses, for spotting links already on a list. */
export function linkKey(href) {
  try {
    const u = new URL(href);
    const m = u.pathname.match(/\/(?:dp|product)\/([A-Z0-9]{10})/i);
    if (/amazon\./.test(u.hostname) && m) return `amazon:${m[1]}`;
  } catch {}
  return href;
}
