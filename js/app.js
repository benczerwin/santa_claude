import { html, render, useState, useEffect, useMemo, useRef } from '../vendor/htm-preact.js';
import * as store from './store.js';
import * as M from './model.js';
import { processPhoto } from './photo.js';

// ───────────────────────── helpers & hooks ─────────────────────────

const ME_KEY = 'santa-claude:me';
const loadMe = () => { try { return localStorage.getItem(ME_KEY); } catch { return null; } };
const saveMe = (id) => { try { id ? localStorage.setItem(ME_KEY, id) : localStorage.removeItem(ME_KEY); } catch {} };

const go = (path) => { location.hash = path; };

function useHash() {
  const parse = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Subscribe to a store watcher; returns undefined until the first result. */
function useWatch(subscribe, deps) {
  const [val, setVal] = useState(undefined);
  useEffect(() => { setVal(undefined); return subscribe(setVal); }, deps);
  return val;
}

/** Re-renders every 30s so the lock flips over on its own at midnight. */
function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    const vis = () => setNow(Date.now());
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, []);
  return now;
}

let pushToast = () => {};
const toast = (msg, kind = 'info') => pushToast({ msg, kind, id: Math.random() });
const fail = (e) => toast(`Sync problem: ${e?.message || e}`, 'error');

function Toasts() {
  const [items, setItems] = useState([]);
  pushToast = (t) => {
    setItems((xs) => [...xs, t]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== t.id)), 3200);
  };
  return html`<div class="toasts">${items.map((t) => html`<div class="toast ${t.kind}" key=${t.id}>${t.msg}</div>`)}</div>`;
}

const byName = (a, b) => a.name.localeCompare(b.name);
const firstName = (p) => (p?.name || 'Someone').split(' ')[0];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Avatar({ person, size = 44 }) {
  return html`<span class="avatar" style=${`--size:${size}px`} aria-hidden="true">${person?.avatar || '🎁'}</span>`;
}

function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; removeEventListener('keydown', esc); };
  }, []);
  return html`
    <div class="sheet-backdrop" onClick=${(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label=${title}>
        <div class="sheet-head">
          <h2>${title}</h2>
          <button class="icon-btn" onClick=${onClose} aria-label="Close">✕</button>
        </div>
        <div class="sheet-body">${children}</div>
      </div>
    </div>`;
}

function AvatarPicker({ value, onChange }) {
  return html`<div class="avatar-pick" role="radiogroup" aria-label="Pick an icon">
    ${M.AVATARS.map((a) => html`<button type="button" role="radio" aria-checked=${a === value}
      class=${a === value ? 'on' : ''} onClick=${() => onChange(a)}>${a}</button>`)}
  </div>`;
}

function PinInput({ value, onInput, autoFocus, label = 'PIN' }) {
  const ref = useRef();
  useEffect(() => { if (autoFocus) setTimeout(() => ref.current?.focus(), 50); }, []);
  return html`<label class="field">
    <span>${label}</span>
    <input ref=${ref} class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4"
      autocomplete="off" placeholder="••••" value=${value}
      onInput=${(e) => onInput(e.target.value.replace(/\D/g, '').slice(0, 4))} />
  </label>`;
}

// ───────────────────────── data actions ─────────────────────────

async function deleteItem(item, claims) {
  store.remove('items', item.id).catch(fail);
  if (item.hasPhoto) store.remove('photos', item.id).catch(fail);
  if (claims.some((c) => c.id === item.id)) store.remove('claims', item.id).catch(fail);
}

/** Removes a person, their items (and photos/claims on them) and the claims they made. */
async function deletePerson(person, { items, claims, people }, inheritorId) {
  for (const it of items.filter((i) => i.ownerId === person.id)) deleteItem(it, claims);
  for (const c of claims.filter((c) => c.claimerId === person.id)) store.remove('claims', c.id).catch(fail);
  for (const p of people.filter((p) => p.managedBy === person.id)) store.patch('people', p.id, { managedBy: inheritorId }).catch(fail);
  store.remove('people', person.id).catch(fail);
}

// ───────────────────────── first-time setup ─────────────────────────

function Setup({ onSignIn }) {
  const [groupName, setGroupName] = useState('Our Family');
  const [lockDate, setLockDate] = useState(M.defaultLockDate());
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🎅');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return toast('Add your name', 'error');
    if (!lockDate) return toast('Pick a lock date', 'error');
    setBusy(true);
    try {
      const id = M.newId();
      const res = await store.transact('settings', 'group', (cur) => (cur ? undefined : {
        name: groupName.trim() || 'Our Family', lockDate, admins: [id], createdAt: Date.now(),
      }));
      if (!res.ok) { toast('Someone already set this up — pick your name.'); return; }
      store.put('people', id, {
        name: name.trim(), label: '', avatar, pinHash: null, managedBy: null, createdAt: Date.now(),
      }).catch(fail);
      onSignIn(id);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return html`<main class="screen">
    <h1 class="title center">Santa Claude</h1>
    <p class="center muted">Christmas lists for the whole family. Let's set it up.</p>
    <form class="panel" onSubmit=${submit}>
      <h2>Your family</h2>
      <label class="field"><span>Group name</span>
        <input value=${groupName} onInput=${(e) => setGroupName(e.target.value)} maxlength="40" /></label>
      <label class="field"><span>Lists lock on</span>
        <input type="date" value=${lockDate} onInput=${(e) => setLockDate(e.target.value)} /></label>
      <p class="hint">Until then, everyone adds to their own list and can't see anyone else's. On this date lists lock and open up for shopping.</p>
      <h2>You</h2>
      <label class="field"><span>Your name</span>
        <input value=${name} onInput=${(e) => setName(e.target.value)} maxlength="30" autocomplete="given-name" /></label>
      <${AvatarPicker} value=${avatar} onChange=${setAvatar} />
      <p class="hint">You'll be the organizer and can change the lock date later.</p>
      <button class="btn primary block" disabled=${busy}>Start our lists 🎄</button>
    </form>
  </main>`;
}

// ───────────────────────── sign in ─────────────────────────

function SignIn({ group, people, onSignIn }) {
  const [picked, setPicked] = useState(null);
  const [joining, setJoining] = useState(false);
  const selectable = people.filter((p) => !p.managedBy).sort(byName);

  if (picked) return html`<${PinScreen} person=${picked} onBack=${() => setPicked(null)} onSignIn=${onSignIn} />`;
  if (joining) return html`<${JoinScreen} people=${people} onBack=${() => setJoining(false)} onSignIn=${onSignIn} />`;

  return html`<main class="screen">
    <h1 class="title center">Santa Claude</h1>
    <p class="center muted">${group.name} · Tap your name</p>
    <div class="people-grid">
      ${selectable.map((p) => html`<button class="person-tile" key=${p.id}
        onClick=${() => (p.pinHash ? setPicked(p) : onSignIn(p.id))}>
        <${Avatar} person=${p} size=${52} /><span>${p.name}${p.pinHash ? ' 🔒' : ''}</span>
        ${p.label && html`<small>${p.label}</small>`}</button>`)}
      <button class="person-tile add" onClick=${() => setJoining(true)}>
        <span class="avatar" style="--size:52px">＋</span><span>I'm new</span></button>
    </div>
  </main>`;
}

function PinScreen({ person, onBack, onSignIn }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  async function check(value) {
    setErr('');
    if (value.length !== 4) return;
    if ((await M.hashPin(person.id, value)) === person.pinHash) onSignIn(person.id);
    else { setErr("That PIN doesn't match. Forgot it? Any organizer can remove it in the Family tab."); setPin(''); }
  }

  return html`<main class="screen narrow">
    <button class="link-btn" onClick=${onBack}>‹ Back</button>
    <div class="center"><${Avatar} person=${person} size=${72} /><h1 class="title">Hi, ${firstName(person)}!</h1></div>
    <div class="panel center">
      <${PinInput} label="Enter your PIN" value=${pin} autoFocus onInput=${(v) => { setPin(v); check(v); }} />
      ${err && html`<p class="error">${err}</p>`}
    </div>
  </main>`;
}

function JoinScreen({ people, onBack, onSignIn }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(M.AVATARS[Math.floor(Math.random() * 8)]);
  const [label, setLabel] = useState('');

  async function submit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return toast('Add your name', 'error');
    if (people.some((p) => p.name.toLowerCase() === n.toLowerCase())) return toast(`${n} is already here — tap your name instead.`, 'error');
    const id = M.newId();
    store.put('people', id, { name: n, label: label.trim(), avatar, pinHash: null, managedBy: null, createdAt: Date.now() }).catch(fail);
    onSignIn(id);
  }

  return html`<main class="screen narrow">
    <button class="link-btn" onClick=${onBack}>‹ Back</button>
    <h1 class="title">Join the family</h1>
    <form class="panel" onSubmit=${submit}>
      <label class="field"><span>Your name</span>
        <input value=${name} onInput=${(e) => setName(e.target.value)} maxlength="30" autocomplete="given-name" /></label>
      <label class="field"><span>Label <em>(optional, e.g. "Grandma" or "Ben's sister")</em></span>
        <input value=${label} onInput=${(e) => setLabel(e.target.value)} maxlength="40" /></label>
      <${AvatarPicker} value=${avatar} onChange=${setAvatar} />
      <button class="btn primary block">Join 🎁</button>
    </form>
  </main>`;
}

// ───────────────────────── home ─────────────────────────

function LockBanner({ group, now }) {
  const locked = M.isLocked(group, now);
  const when = M.fmtDate(group.lockDate, { weekday: 'short', month: 'short', day: 'numeric' });
  return locked
    ? html`<div class="banner locked"><b>🎁 Lists are locked. Happy shopping!</b>
        <span>Claim what you'll buy so nobody doubles up.</span></div>`
    : html`<div class="banner open"><b>📝 Lists lock ${when}</b>
        <span>${M.timeLeft(group, now)} left to add to your list. After that, everyone else can see it and start shopping.</span></div>`;
}

function Home({ me, group, people, items, claims, now }) {
  const locked = M.isLocked(group, now);
  const countFor = (pid) => items.filter((i) => i.ownerId === pid).length;
  const availableFor = (pid) => items.filter((i) => i.ownerId === pid && !claims.some((c) => c.id === i.id)).length;
  const managed = people.filter((p) => p.managedBy === me.id).sort(byName);
  const others = people.filter((p) => p.id !== me.id && p.managedBy !== me.id).sort(byName);
  const myClaims = claims.filter((c) => c.claimerId === me.id && items.some((i) => i.id === c.id));
  const toBuy = myClaims.filter((c) => c.status !== 'bought').length;

  const card = (p, sub, tag) => html`<a class="list-card" key=${p.id} href=${`#/list/${p.id}`}>
    <${Avatar} person=${p} />
    <span class="grow"><b>${p.id === me.id ? 'My list' : `${p.name}'s list`}</b>
      <small>${p.id !== me.id && p.label ? `${p.label} · ` : ''}${sub}</small></span>
    ${tag && html`<span class="tag">${tag}</span>`}
    <span class="chev">›</span>
  </a>`;

  const otherSub = (p) => {
    const n = countFor(p.id);
    if (!locked) return `Opens ${M.fmtDate(group.lockDate)} · ${plural(n, 'item')} so far`;
    if (!n) return 'Nothing on this list yet';
    const a = availableFor(p.id);
    return a ? `${a} of ${plural(n, 'item')} still available` : `All ${n} claimed`;
  };

  return html`<main class="screen">
    <header class="top">
      <div><small class="muted">${group.name}</small><h1 class="title">Hi, ${firstName(me)} ${me.avatar}</h1></div>
    </header>
    <${LockBanner} group=${group} now=${now} />

    <h2 class="section">Yours</h2>
    ${card(me, locked ? `${plural(countFor(me.id), 'item')} · locked` : `${plural(countFor(me.id), 'item')} · tap to add more`)}
    ${managed.map((p) => card(p, locked ? otherSub(p) : `${plural(countFor(p.id), 'item')} · you manage this list`, 'Managed'))}

    ${locked && html`<a class="list-card shopping" href="#/shopping">
      <span class="avatar" style="--size:44px">🛒</span>
      <span class="grow"><b>My shopping</b><small>${myClaims.length
        ? `${toBuy} to buy · ${myClaims.length - toBuy} bought`
        : 'Nothing claimed yet'}</small></span>
      <span class="chev">›</span></a>`}

    <h2 class="section">Family</h2>
    ${others.length
      ? others.map((p) => card(p, otherSub(p), locked ? null : '🔒'))
      : html`<p class="muted empty">Nobody else yet. Send them the link to this page so they can join!</p>`}
  </main>`;
}

// ───────────────────────── a list ─────────────────────────

const PRICE_FILTERS = [[null, 'Any price'], [25, '≤ $25'], [50, '≤ $50'], [100, '≤ $100']];

function ListScreen({ personId, me, group, people, items, claims, now }) {
  const person = people.find((p) => p.id === personId);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [show, setShow] = useState('all');
  const [maxPrice, setMaxPrice] = useState(null);
  if (!person) return html`<main class="screen"><p class="muted">That list doesn't exist anymore.</p><a href="#/" class="btn">Home</a></main>`;

  const mode = M.listMode(me, person, group, now);
  const own = person.id === me.id;
  const list = M.sortItems(items.filter((i) => i.ownerId === person.id));
  const claimOf = (id) => claims.find((c) => c.id === id);
  const shown = mode !== 'shop' ? list : list.filter((i) => {
    const c = claimOf(i.id);
    if (show === 'available' && c) return false;
    if (show === 'mine' && c?.claimerId !== me.id) return false;
    if (maxPrice != null && (i.price == null || i.price > maxPrice)) return false;
    return true;
  });
  const lockWhen = M.fmtDate(group.lockDate, { weekday: 'long', month: 'long', day: 'numeric' });

  const intro = {
    edit: own
      ? `Add anything you'd like. You can change it until ${lockWhen}.`
      : `You're managing ${firstName(person)}'s list. You can change it until ${lockWhen}.`,
    owner: "Your list is locked. What people have bought is hidden. No peeking! 🤫",
    shop: "Tap an item for details, then claim it so nobody else buys it too.",
  }[mode];

  return html`<main class="screen">
    <a class="link-btn" href="#/">‹ Home</a>
    <header class="list-head">
      <${Avatar} person=${person} size=${56} />
      <div><h1 class="title">${own ? 'My list' : `${person.name}'s list`}</h1>
        <small class="muted">${plural(list.length, 'item')}</small></div>
    </header>

    ${mode === 'hidden'
      ? html`<div class="panel center locked-list">
          <div class="big-emoji">🔒</div>
          <p><b>${firstName(person)}'s list opens ${lockWhen}.</b></p>
          <p class="muted">Lists stay private while people are still writing them. ${list.length ? `So far there ${list.length === 1 ? 'is 1 item' : `are ${list.length} items`}.` : ''}</p>
        </div>`
      : html`
        <p class="intro">${intro}</p>
        ${mode === 'edit' && html`<button class="btn primary block" onClick=${() => setEditing('new')}>＋ Add an item</button>`}
        ${mode === 'shop' && list.length > 0 && html`<div class="filters">
          <div class="chips">${[['all', 'All'], ['available', 'Available'], ['mine', 'Mine']].map(([k, l]) =>
            html`<button class=${`chip ${show === k ? 'on' : ''}`} onClick=${() => setShow(k)}>${l}</button>`)}</div>
          <div class="chips">${PRICE_FILTERS.map(([v, l]) =>
            html`<button class=${`chip ${maxPrice === v ? 'on' : ''}`} onClick=${() => setMaxPrice(v)}>${l}</button>`)}</div>
        </div>`}
        <div class="items">
          ${shown.map((it) => html`<${ItemCard} key=${it.id} item=${it} mode=${mode} me=${me} people=${people}
            claim=${claimOf(it.id)} onEdit=${() => setEditing(it)} claims=${claims} />`)}
        </div>
        ${!list.length && html`<p class="muted empty center">${mode === 'edit' ? 'Nothing here yet. Add your first wish! ✨' : 'Nothing on this list.'}</p>`}
        ${list.length > 0 && !shown.length && html`<p class="muted empty center">No items match these filters.</p>`}
      `}

    ${editing && html`<${ItemSheet} item=${editing === 'new' ? null : editing} owner=${person} me=${me}
      onClose=${() => setEditing(null)} />`}
  </main>`;
}

function ClaimPill({ claim, me, people }) {
  if (!claim) return null;
  const mine = claim.claimerId === me.id;
  const who = mine ? 'You' : firstName(people.find((p) => p.id === claim.claimerId));
  const bought = claim.status === 'bought';
  return html`<span class=${`pill ${bought ? 'bought' : 'claimed'} ${mine ? 'mine' : ''}`}>
    ${bought ? '✓ Bought' : 'Claimed'} · ${who}</span>`;
}

function ItemCard({ item, mode, me, people, claim, claims, onEdit }) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const meta = M.itemMeta(item);
  const shop = mode === 'shop';
  const takenByOther = shop && claim && claim.claimerId !== me.id;

  async function doClaim() {
    setBusy(true);
    try {
      const r = await store.transact('claims', item.id, (cur) => (cur ? undefined : {
        ownerId: item.ownerId, claimerId: me.id, status: 'claimed', at: Date.now(),
      }));
      if (!r.ok) toast('Someone just claimed that one.', 'error');
      else toast("It's yours! It's on your shopping list.");
    } catch (e) {
      toast("Couldn't claim it. Check your connection and try again.", 'error');
    } finally {
      setBusy(false);
    }
  }
  const setBought = (b) => store.patch('claims', item.id, { status: b ? 'bought' : 'claimed', at: Date.now() }).catch(fail);
  const unclaim = () => { if (confirm('Unclaim this? Others will be able to claim it.')) store.remove('claims', item.id).catch(fail); };
  const del = () => { if (confirm(`Delete "${item.title}"?`)) deleteItem(item, claims); };

  return html`<article class=${`item ${open ? 'open' : ''} ${takenByOther ? 'taken' : ''} ${item.priority ? 'star' : ''}`}>
    <button class="item-row" onClick=${() => setOpen(!open)} aria-expanded=${open}>
      ${item.thumb && html`<img class="thumb" src=${item.thumb} alt="" />`}
      <span class="grow">
        <span class="item-title">${item.priority && html`<span class="star-ico" title="Really wants this">★ </span>`}${item.title}</span>
        ${meta && html`<small class="meta">${meta}</small>`}
        ${!open && item.notes && html`<small class="notes-snip">${item.notes}</small>`}
      </span>
      ${shop && html`<${ClaimPill} claim=${claim} me=${me} people=${people} />`}
    </button>
    ${open && html`<div class="item-body">
      ${item.notes && html`<p class="notes">${item.notes}</p>`}
      ${item.link && html`<a class="btn link" href=${item.link} target="_blank" rel="noopener noreferrer">🔗 Open ${M.linkHost(item.link)} ↗</a>`}
      ${item.hasPhoto && html`<button class="btn" onClick=${() => setPhoto(true)}>🖼 View photo</button>`}
      <div class="actions">
        ${mode === 'edit' && html`
          <button class="btn" onClick=${onEdit}>✏️ Edit</button>
          <button class="btn danger" onClick=${del}>Delete</button>`}
        ${shop && !claim && html`<button class="btn primary" disabled=${busy} onClick=${doClaim}>🎁 I'll get this</button>`}
        ${shop && claim?.claimerId === me.id && (claim.status === 'bought'
          ? html`<button class="btn" onClick=${() => setBought(false)}>Undo bought</button>`
          : html`<button class="btn primary" onClick=${() => setBought(true)}>✓ Mark bought</button>
                 <button class="btn" onClick=${unclaim}>Unclaim</button>`)}
        ${takenByOther && html`<p class="muted small">${firstName(people.find((p) => p.id === claim.claimerId))} is getting this one.</p>`}
      </div>
    </div>`}
    ${photo && html`<${Lightbox} id=${item.id} onClose=${() => setPhoto(false)} />`}
  </article>`;
}

function Lightbox({ id, onClose }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { store.getOne('photos', id).then((p) => setSrc(p?.full || '')); }, [id]);
  return html`<div class="lightbox" onClick=${onClose}>
    ${src === null ? html`<p>Loading…</p>` : src ? html`<img src=${src} alt="" />` : html`<p>Photo not found.</p>`}
  </div>`;
}

function ItemSheet({ item, owner, me, onClose }) {
  const [f, setF] = useState(() => ({
    title: item?.title || '', link: item?.link || '', notes: item?.notes || '',
    price: item?.price != null ? String(item.price) : '', qty: item?.qty || 1,
    size: item?.size || '', color: item?.color || '', priority: !!item?.priority,
  }));
  const [thumb, setThumb] = useState(item?.thumb || null);
  const [newPhoto, setNewPhoto] = useState(null); // {thumb, full} | 'remove' | null
  const [more, setMore] = useState(!!(item && (item.price != null || item.size || item.color || item.qty > 1)));
  const [busy, setBusy] = useState(false);
  const titleRef = useRef();
  useEffect(() => { if (!item) setTimeout(() => titleRef.current?.focus(), 80); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const p = await processPhoto(file);
      setNewPhoto(p);
      setThumb(p.thumb);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function save(e) {
    e.preventDefault();
    const title = f.title.trim();
    if (!title) return toast('Give it a name', 'error');
    const link = M.normalizeLink(f.link);
    if (f.link.trim() && !link) return toast("That link doesn't look right", 'error');
    const id = item?.id || M.newId();
    const doc = {
      ownerId: owner.id, title, link, notes: f.notes.trim(),
      price: M.parsePrice(f.price), qty: Math.max(1, parseInt(f.qty, 10) || 1),
      size: f.size.trim(), color: f.color.trim(), priority: f.priority,
      thumb: thumb || null, hasPhoto: !!thumb,
      createdAt: item?.createdAt || Date.now(), addedBy: item?.addedBy || me.id, updatedAt: Date.now(),
    };
    if (newPhoto && newPhoto !== 'remove') store.put('photos', id, { full: newPhoto.full, ownerId: owner.id }).catch(fail);
    if (newPhoto === 'remove') store.remove('photos', id).catch(fail);
    store.put('items', id, doc).catch(fail);
    toast(item ? 'Saved' : 'Added to the list 🎄');
    onClose();
  }

  return html`<${Sheet} title=${item ? 'Edit item' : 'Add an item'} onClose=${onClose}>
    <form onSubmit=${save}>
      <label class="field"><span>What is it?</span>
        <input value=${f.title} onInput=${set('title')} maxlength="120" placeholder="e.g. Cozy slippers" ref=${titleRef} /></label>
      <label class="field"><span>Link <em>(optional)</em></span>
        <input type="text" inputmode="url" autocapitalize="off" autocorrect="off" value=${f.link} onInput=${set('link')}
          placeholder="Paste a link to the product" /></label>
      <label class="field"><span>Notes <em>(optional)</em></span>
        <textarea rows="3" value=${f.notes} onInput=${set('notes')} maxlength="1000"
          placeholder="Any store, style, or other details"></textarea></label>
      <label class="toggle"><input type="checkbox" checked=${f.priority} onChange=${set('priority')} />
        <span>★ I really want this</span></label>

      ${more
        ? html`<div class="grid2">
            <label class="field"><span>Price</span>
              <input inputmode="decimal" value=${f.price} onInput=${set('price')} placeholder="$" /></label>
            <label class="field"><span>Quantity</span>
              <input type="number" inputmode="numeric" min="1" max="99" value=${f.qty} onInput=${set('qty')} /></label>
            <label class="field"><span>Size</span>
              <input value=${f.size} onInput=${set('size')} maxlength="30" /></label>
            <label class="field"><span>Color</span>
              <input value=${f.color} onInput=${set('color')} maxlength="30" /></label>
          </div>`
        : html`<button type="button" class="link-btn" onClick=${() => setMore(true)}>＋ Price, quantity, size, color</button>`}

      <div class="photo-field">
        ${thumb && html`<img class="thumb big" src=${thumb} alt="" />`}
        <label class="btn">${thumb ? 'Change photo' : '📷 Add photo'}
          <input type="file" accept="image/*" hidden onChange=${pickPhoto} /></label>
        ${thumb && html`<button type="button" class="btn" onClick=${() => { setThumb(null); setNewPhoto(item?.hasPhoto ? 'remove' : null); }}>Remove</button>`}
      </div>

      <button class="btn primary block" disabled=${busy}>${busy ? 'Processing photo…' : item ? 'Save' : 'Add to list'}</button>
    </form>
  <//>`;
}

// ───────────────────────── shopping ─────────────────────────

function Shopping({ me, group, people, items, claims, now }) {
  const mine = claims.filter((c) => c.claimerId === me.id)
    .map((c) => ({ c, item: items.find((i) => i.id === c.id) })).filter((x) => x.item);
  const toBuy = mine.filter((x) => x.c.status !== 'bought');
  const total = mine.reduce((s, x) => s + (x.item.price || 0) * (x.item.qty || 1), 0);
  const owners = [...new Set(mine.map((x) => x.item.ownerId))]
    .map((id) => people.find((p) => p.id === id)).filter(Boolean).sort(byName);

  return html`<main class="screen">
    <a class="link-btn" href="#/">‹ Home</a>
    <h1 class="title">My shopping 🛒</h1>
    ${!mine.length
      ? html`<p class="muted empty">${M.isLocked(group, now)
          ? "You haven't claimed anything yet. Open someone's list and tap \"I'll get this\"."
          : `Shopping opens ${M.fmtDate(group.lockDate, { weekday: 'long', month: 'long', day: 'numeric' })}, when lists lock.`}</p>`
      : html`
        <div class="stats">
          <div><b>${toBuy.length}</b><small>to buy</small></div>
          <div><b>${mine.length - toBuy.length}</b><small>bought</small></div>
          ${total > 0 && html`<div><b>${M.fmtPrice(Math.round(total))}</b><small>est. total</small></div>`}
        </div>
        ${owners.map((p) => html`<section key=${p.id} class="panel tight">
          <h2 class="row"><${Avatar} person=${p} size=${30} /><a href=${`#/list/${p.id}`}>For ${p.name}</a></h2>
          ${mine.filter((x) => x.item.ownerId === p.id).map(({ c, item }) => html`<label class="shop-row" key=${item.id}>
            <input type="checkbox" checked=${c.status === 'bought'}
              onChange=${(e) => store.patch('claims', item.id, { status: e.target.checked ? 'bought' : 'claimed', at: Date.now() }).catch(fail)} />
            <span class="grow"><span class=${c.status === 'bought' ? 'done' : ''}>${item.title}</span>
              ${M.itemMeta(item) && html`<small class="meta">${M.itemMeta(item)}</small>`}</span>
            ${item.link && html`<a class="mini-link" href=${item.link} target="_blank" rel="noopener noreferrer" onClick=${(e) => e.stopPropagation()}>Link ↗</a>`}
          </label>`)}
        </section>`)}
      `}
  </main>`;
}

// ───────────────────────── settings ─────────────────────────

function PersonSheet({ person, title, onSave, onClose, children }) {
  const [name, setName] = useState(person?.name || '');
  const [label, setLabel] = useState(person?.label || '');
  const [avatar, setAvatar] = useState(person?.avatar || '🧸');
  return html`<${Sheet} title=${title} onClose=${onClose}>
    <form onSubmit=${(e) => {
      e.preventDefault();
      if (!name.trim()) return toast('Add a name', 'error');
      onSave({ name: name.trim(), label: label.trim(), avatar });
      onClose();
    }}>
      <label class="field"><span>Name</span><input value=${name} onInput=${(e) => setName(e.target.value)} maxlength="30" /></label>
      <label class="field"><span>Label <em>(optional)</em></span>
        <input value=${label} onInput=${(e) => setLabel(e.target.value)} maxlength="40" placeholder="e.g. Grandma, Ben's sister" /></label>
      <${AvatarPicker} value=${avatar} onChange=${setAvatar} />
      <button class="btn primary block">Save</button>
    </form>
    ${children}
  <//>`;
}

function PinSheet({ me, onClose }) {
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  async function save(e) {
    e.preventDefault();
    if (!M.validPin(pin)) return toast('PIN must be 4 digits', 'error');
    if (pin !== pin2) return toast("PINs don't match", 'error');
    store.patch('people', me.id, { pinHash: await M.hashPin(me.id, pin) }).catch(fail);
    toast('PIN saved');
    onClose();
  }
  return html`<${Sheet} title=${me.pinHash ? 'Change PIN' : 'Add a PIN'} onClose=${onClose}>
    <form onSubmit=${save}>
      <p class="hint">Optional. Others will need it to sign in as you on their phone. If you forget it, an organizer can remove it.</p>
      <${PinInput} label="New PIN" value=${pin} onInput=${setPin} autoFocus />
      <${PinInput} label="Again" value=${pin2} onInput=${setPin2} />
      <button class="btn primary block">Save PIN</button>
    </form>
  <//>`;
}

function AddListSheet({ me, onClose }) {
  return html`<${PersonSheet} title="Add a list for someone" onClose=${onClose}
    onSave=${(d) => {
      const id = M.newId();
      store.put('people', id, { ...d, pinHash: null, managedBy: me.id, createdAt: Date.now() }).catch(fail);
      toast(`Added ${d.name}. Open their list to add items.`);
    }} />`;
}

// ───────────────────────── family ─────────────────────────

function Family({ me, group, people, items, claims }) {
  const [editing, setEditing] = useState(null); // person | 'add'
  const admin = M.isAdmin(group, me);
  const admins = group.admins || [];
  const all = { items, claims, people };
  const canEditPerson = (p) => admin || M.canEdit(me, p);
  const sorted = [...people].sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : byName(a, b)));

  const sub = (p) => [
    admins.includes(p.id) ? 'Organizer' : '',
    p.managedBy ? `Managed by ${p.managedBy === me.id ? 'you' : firstName(people.find((x) => x.id === p.managedBy))}` : '',
    plural(items.filter((i) => i.ownerId === p.id).length, 'item'),
  ].filter(Boolean).join(' · ');

  const removePerson = (p) => {
    const n = items.filter((i) => i.ownerId === p.id).length;
    if (!confirm(`Remove ${p.name}? This deletes their list (${plural(n, 'item')}) and anything they've claimed. This can't be undone.`)) return;
    deletePerson(p, all, me.id);
    setEditing(null);
  };
  const removePin = (p) => {
    if (!confirm(`Remove ${p.name}'s PIN? They'll be able to sign in by tapping their name.`)) return;
    store.patch('people', p.id, { pinHash: null }).catch(fail);
    toast(`${firstName(p)}'s PIN removed`);
  };
  const toggleAdmin = (p) => store.patch('settings', 'group', {
    admins: admins.includes(p.id) ? admins.filter((x) => x !== p.id) : [...admins, p.id],
  }).catch(fail);

  const ed = editing && editing !== 'add' ? people.find((p) => p.id === editing.id) : null;
  const canRemove = ed && ed.id !== me.id && (admin || ed.managedBy === me.id);

  return html`<main class="screen">
    <h1 class="title">${group.name}</h1>
    <p class="muted">${people.length} ${people.length === 1 ? 'person' : 'people'} · lists lock ${M.fmtDate(group.lockDate, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
    ${sorted.map((p) => html`<div class="member" key=${p.id}>
      <a href=${`#/list/${p.id}`}><${Avatar} person=${p} size=${48} /></a>
      <a class="grow" href=${`#/list/${p.id}`} style="text-decoration:none">
        <b>${p.name}${p.id === me.id ? ' (you)' : ''}</b>
        ${p.label && html`<span class="label">${p.label}</span>`}
        <small>${sub(p)}</small>
      </a>
      ${canEditPerson(p) && html`<button class="btn small" onClick=${() => setEditing(p)}>Edit</button>`}
    </div>`)}
    <button class="btn block" onClick=${() => setEditing('add')}>＋ Add a list for someone without a phone</button>
    <p class="hint center gap-top">Anyone else can join by opening this site and tapping "I'm new".</p>

    ${editing === 'add' && html`<${AddListSheet} me=${me} onClose=${() => setEditing(null)} />`}
    ${ed && html`<${PersonSheet} title=${ed.id === me.id ? 'Edit you' : `Edit ${ed.name}`} person=${ed}
      onClose=${() => setEditing(null)} onSave=${(d) => store.patch('people', ed.id, d).catch(fail)}>
      ${(admin && ed.id !== me.id || canRemove) && html`<div class="sheet-extra">
        <h3 class="section">Organizer tools</h3>
        <div class="row wrap">
          ${admin && ed.id !== me.id && ed.pinHash && html`<button class="btn small" onClick=${() => removePin(ed)}>Remove PIN</button>`}
          ${admin && ed.id !== me.id && !ed.managedBy && html`<button class="btn small" onClick=${() => toggleAdmin(ed)}>
            ${admins.includes(ed.id) ? 'Remove organizer' : 'Make organizer'}</button>`}
          ${canRemove && html`<button class="btn small danger" onClick=${() => removePerson(ed)}>Remove ${firstName(ed)}</button>`}
        </div>
      </div>`}
    <//>`}
  </main>`;
}

// ───────────────────────── settings ─────────────────────────

function Settings({ me, group, people, items, claims, onSignOut }) {
  const [sheet, setSheet] = useState(null);
  const admin = M.isAdmin(group, me);
  const [gName, setGName] = useState(group.name);
  const [lockDate, setLockDate] = useState(group.lockDate);
  useEffect(() => { setGName(group.name); setLockDate(group.lockDate); }, [group.name, group.lockDate]);
  const admins = people.filter((p) => (group.admins || []).includes(p.id));

  const saveGroup = () => {
    if (!lockDate) return toast('Pick a lock date', 'error');
    store.patch('settings', 'group', { name: gName.trim() || group.name, lockDate }).catch(fail);
    toast('Saved');
  };
  const removeMyPin = () => {
    if (!confirm('Remove your PIN? Anyone could then sign in as you by tapping your name.')) return;
    store.patch('people', me.id, { pinHash: null }).catch(fail);
    toast('PIN removed');
  };
  const newYear = () => {
    if (!confirm('Clear EVERY list and all claims for everyone, ready for next year? People stay. This can\'t be undone.')) return;
    if (!confirm('Really clear all lists?')) return;
    for (const it of items) deleteItem(it, claims);
    for (const c of claims) store.remove('claims', c.id).catch(fail);
    toast('All lists cleared. Set the new lock date above.');
  };

  return html`<main class="screen">
    <h1 class="title">Settings</h1>

    <section class="panel">
      <h2>You</h2>
      <div class="row"><${Avatar} person=${me} />
        <span class="grow"><b>${me.name}</b>${me.label && html`<small class="muted block">${me.label}</small>`}</span>
        <button class="btn small" onClick=${() => setSheet('me')}>Edit</button></div>
      <h2>PIN <span class="muted" style="font-weight:600">(optional)</span></h2>
      <p class="hint">${me.pinHash
        ? 'You have a PIN, so people need it to sign in as you.'
        : "Anyone can sign in as you by tapping your name. Add a PIN if you'd rather they couldn't peek."}</p>
      <div class="row wrap">
        <button class="btn" onClick=${() => setSheet('pin')}>${me.pinHash ? 'Change PIN' : 'Add a PIN'}</button>
        ${me.pinHash && html`<button class="btn" onClick=${removeMyPin}>Remove PIN</button>`}
      </div>
      <button class="btn block" onClick=${onSignOut}>Switch person</button>
    </section>

    <section class="panel">
      <h2>Lock date</h2>
      ${admin
        ? html`
          <label class="field"><span>Group name</span><input value=${gName} onInput=${(e) => setGName(e.target.value)} maxlength="40" /></label>
          <label class="field"><span>Lists lock on</span><input type="date" value=${lockDate} onInput=${(e) => setLockDate(e.target.value)} /></label>
          <p class="hint">Move it later to let people keep editing; move it earlier to open shopping sooner.</p>
          <button class="btn primary" onClick=${saveGroup}>Save</button>
          <h2>Next year</h2>
          <button class="btn danger block" onClick=${newYear}>Clear all lists & claims</button>`
        : html`<p>Lists lock on <b>${M.fmtDate(group.lockDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>.</p>
          <p class="hint">Organizer${admins.length === 1 ? '' : 's'}: ${admins.map((a) => a.name).join(', ') || 'none'}. They can change the date and manage people.</p>`}
    </section>

    <p class="muted small center">${store.isLive ? '🟢 Live sync' : '🟡 Demo mode: saved on this device only'}</p>

    ${sheet === 'me' && html`<${PersonSheet} title="Edit you" person=${me} onClose=${() => setSheet(null)}
      onSave=${(d) => store.patch('people', me.id, d).catch(fail)} />`}
    ${sheet === 'pin' && html`<${PinSheet} me=${me} onClose=${() => setSheet(null)} />`}
  </main>`;
}

// ───────────────────────── shell ─────────────────────────

function TabBar({ me, route }) {
  const tab = route[0] === 'list' && route[1] === me.id ? 'mine' : route[0] || 'home';
  const tabs = [
    ['home', '#/', '🏠', 'Home'],
    ['mine', `#/list/${me.id}`, '📝', 'My list'],
    ['shopping', '#/shopping', '🛒', 'Shopping'],
    ['family', '#/family', '👪', 'Family'],
    ['settings', '#/settings', '⚙️', 'Settings'],
  ];
  return html`<nav class="tabbar">${tabs.map(([k, href, ico, label]) =>
    html`<a href=${href} class=${tab === k ? 'on' : ''} aria-current=${tab === k ? 'page' : null}>
      <span aria-hidden="true">${ico}</span><small>${label}</small></a>`)}</nav>`;
}

function App() {
  const route = useHash();
  const now = useNow();
  const [meId, setMeId] = useState(loadMe);
  const group = useWatch((cb) => store.watchDoc('settings', 'group', cb), []);
  const people = useWatch((cb) => store.watchAll('people', cb), []);
  const items = useWatch((cb) => store.watchAll('items', cb), []);
  const claims = useWatch((cb) => store.watchAll('claims', cb), []);

  const signIn = (id) => { saveMe(id); setMeId(id); go('/'); };
  const signOut = () => { saveMe(null); setMeId(null); go('/'); };

  let body;
  if (group === undefined || people === undefined || items === undefined || claims === undefined) {
    body = html`<main class="screen"><p class="muted center">Loading…</p></main>`;
  } else if (group === null) {
    body = html`<${Setup} onSignIn=${signIn} />`;
  } else {
    const me = people.find((p) => p.id === meId && !p.managedBy);
    if (!me) {
      body = html`<${SignIn} group=${group} people=${people} onSignIn=${signIn} />`;
    } else {
      const props = { me, group, people, items, claims, now };
      const screen = route[0] === 'list' ? html`<${ListScreen} ...${props} personId=${route[1]} />`
        : route[0] === 'shopping' ? html`<${Shopping} ...${props} />`
        : route[0] === 'family' ? html`<${Family} ...${props} />`
        : route[0] === 'settings' ? html`<${Settings} ...${props} onSignOut=${signOut} />`
        : html`<${Home} ...${props} />`;
      body = html`${screen}<${TabBar} me=${me} route=${route} />`;
    }
  }

  return html`${!store.isLive && html`<div class="demo-bar">Demo mode: saved on this device only</div>`}${body}<${Toasts} />`;
}

render(html`<${App} />`, document.getElementById('app'));
