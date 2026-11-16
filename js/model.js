// Pure rules for lists: lock date, who sees what, PINs, links, formatting.

export const AVATARS = ['🎅', '🤶', '🦌', '⛄', '🎄', '🍪', '🧦', '🔔', '⭐', '🎁', '🐧', '🧸', '🐻‍❄️', '🦊', '🍭', '❄️'];

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

export function sortItems(items) {
  return [...items].sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0) || (a.createdAt || 0) - (b.createdAt || 0));
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

// ── PINs ──
// Light protection against peeking, not real security: anyone with the Firebase config could read the data.

export async function hashPin(personId, pin) {
  const text = `santa-claude|${personId}|${pin}`;
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Non-secure context (e.g. LAN IP over http): FNV-1a fallback.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `fnv-${h.toString(16)}`;
}

export const validPin = (pin) => /^\d{4}$/.test(pin);
