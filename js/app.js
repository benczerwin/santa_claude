import { html, render, useState, useEffect, useRef } from '../vendor/htm-preact.js';
import * as store from './store.js';
import * as M from './model.js';
import { processPhoto } from './photo.js';
import { iconSVG } from './icons.js';
import { loadSample } from './sample.js';
import { listPicture, shoppingWorkbook, shareOrDownload, loadXLSX } from './export.js';

// ───────────────────────── helpers & hooks ─────────────────────────

const ME_KEY = 'santa-claude:me';
const YEAR_KEY = 'santa-claude:year';
const loadKey = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const saveKey = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };

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
const longDate = (d) => M.fmtDate(d, { weekday: 'long', month: 'long', day: 'numeric' });

const iconCache = {};
function Icon({ name, size = 20 }) {
  const svg = (iconCache[`${name}${size}`] ??= iconSVG(name, size));
  return html`<span class="icon" dangerouslySetInnerHTML=${{ __html: svg }} />`;
}

function Avatar({ person, size = 44 }) {
  return html`<span class="avatar" style=${`--size:${size}px`} aria-hidden="true">${person?.avatar || '🎁'}</span>`;
}

/** Same header on every page: small line above, title, optional thing on the right. */
function PageHeader({ eyebrow, title, right, children }) {
  return html`<header class="page-head">
    <div class="grow">
      ${eyebrow && html`<div class="eyebrow">${eyebrow}</div>`}
      <h1 class="title">${title}</h1>
      ${children}
    </div>
    ${right}
  </header>`;
}

/** Bottom sheet. Swipe down (or tap outside / Done) to close. Contents save as you go. */
function Sheet({ title, onClose, status, children }) {
  const sheetRef = useRef();
  const bodyRef = useRef();
  const [dy, setDy] = useState(0);
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 180); };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => e.key === 'Escape' && close();
    addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; removeEventListener('keydown', esc); };
  }, []);

  // Touch drag: from the grabber/header always; from the body only when it's scrolled to the top.
  useEffect(() => {
    const el = sheetRef.current;
    let st = null;
    const start = (e) => {
      const t = e.touches[0];
      const inHead = !!e.target.closest('.sheet-grab, .sheet-head');
      const atTop = (bodyRef.current?.scrollTop || 0) <= 0;
      if (!inHead && (!atTop || e.target.closest('input, textarea, select, .avatar-pick'))) { st = null; return; }
      st = { y: t.clientY, t: Date.now(), dy: 0, active: inHead };
    };
    const move = (e) => {
      if (!st) return;
      const d = e.touches[0].clientY - st.y;
      if (!st.active) {
        if (d < -4) { st = null; return; } // scrolling up into the content
        if (d > 6) st.active = true; else return;
      }
      e.preventDefault();
      st.dy = Math.max(0, d);
      setDy(st.dy);
    };
    const end = () => {
      if (!st) return;
      const v = st.dy / Math.max(1, Date.now() - st.t);
      const done = st.active && (st.dy > 110 || (st.dy > 40 && v > 0.6));
      st = null;
      if (done) close(); else setDy(0);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, []);

  return html`
    <div class=${`sheet-backdrop ${closing ? 'closing' : ''}`} onClick=${(e) => e.target === e.currentTarget && close()}>
      <div class=${`sheet ${dy ? 'dragging' : ''}`} ref=${sheetRef} role="dialog" aria-modal="true" aria-label=${title}
        style=${dy ? `transform:translateY(${dy}px)` : ''}>
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-head">
          <h2>${title}</h2>
          ${status && html`<span class="sheet-status">${status}</span>`}
          <button class="done-btn" onClick=${close}>Done</button>
        </div>
        <div class="sheet-body" ref=${bodyRef}>${children}</div>
      </div>
    </div>`;
}

/** Saves `value` via `save` ~0.5s after it stops changing, and right away when the sheet closes. */
function useAutosave(value, save, { enabled = true } = {}) {
  const [status, setStatus] = useState('');
  const timer = useRef(null);
  const latest = useRef(value);
  const dirty = useRef(false);
  const first = useRef(true);
  latest.current = value;
  const flush = () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    if (save(latest.current) !== false) setStatus('Saved');
  };
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!enabled) return;
    dirty.current = true;
    setStatus('Saving…');
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [JSON.stringify(value)]);
  useEffect(() => () => flush(), []);
  const cancel = () => { clearTimeout(timer.current); timer.current = null; dirty.current = false; };
  return [status, cancel];
}

/** First emoji in a string (handles skin tones, ZWJ sequences and flags), or ''. */
function firstEmoji(text) {
  const parts = 'Segmenter' in Intl
    ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (x) => x.segment)
    : Array.from(text);
  return parts.find((g) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) || '';
}

function AvatarPicker({ value, onChange }) {
  const custom = value && !M.AVATARS.includes(value);
  const [text, setText] = useState('');
  return html`<div class="field"><span>Icon</span>
    <div class="avatar-pick" role="radiogroup" aria-label="Pick an icon">
      ${custom && html`<button type="button" role="radio" aria-checked="true" class="on">${value}</button>`}
      ${M.AVATARS.map((a) => html`<button type="button" role="radio" aria-checked=${a === value}
        class=${a === value ? 'on' : ''} onClick=${() => onChange(a)}>${a}</button>`)}
    </div>
    <label class="emoji-own">
      <span>Or use your own</span>
      <input value=${text} placeholder="Type any emoji" autocomplete="off" autocorrect="off" spellcheck="false"
        enterkeyhint="done" onInput=${(e) => {
          const em = firstEmoji(e.target.value);
          setText(em);
          e.target.value = em;
          if (em) onChange(em);
        }} />
    </label>
  </div>`;
}

// ───────────────────────── swipe & drag ─────────────────────────

/**
 * Row you can swipe sideways. `left` is revealed by swiping right, `right` by swiping left:
 * { icon, label, tone: 'green'|'red'|'gold', onAction }. Vertical scrolling still works.
 */
function SwipeRow({ left, right, class: cls = '', style, rowRef, children }) {
  const [dx, setDx] = useState(0);
  const st = useRef(null);
  const elRef = useRef();
  const TRIGGER = 80;

  const down = (e) => {
    if (e.button > 0 || e.target.closest('button, a, input, label, .handle')) return;
    st.current = { x: e.clientX, y: e.clientY, active: false };
  };
  const move = (e) => {
    const s = st.current;
    if (!s) return;
    const mx = e.clientX - s.x, my = e.clientY - s.y;
    if (!s.active) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { st.current = null; return; }
      if (Math.abs(mx) < 10) return;
      s.active = true;
      try { elRef.current?.setPointerCapture(e.pointerId); } catch {}
    }
    let v = mx;
    if ((v > 0 && !left) || (v < 0 && !right)) v = 0;
    const a = Math.abs(v);
    setDx(Math.sign(v) * (a < 120 ? a : 120 + (a - 120) * 0.25));
    s.dx = v;
  };
  const swipedAt = useRef(0);
  const up = () => {
    const s = st.current;
    st.current = null;
    if (s?.active) {
      swipedAt.current = Date.now();
      if (s.dx >= TRIGGER) left?.onAction();
      else if (s.dx <= -TRIGGER) right?.onAction();
    }
    setDx(0);
  };

  const side = dx > 0 ? left : dx < 0 ? right : null;
  const armed = Math.abs(dx) >= TRIGGER;
  return html`<div class=${`swipe ${cls}`} style=${style} ref=${(el) => { elRef.current = el; rowRef?.(el); }}
      onPointerDown=${down} onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}
      onClickCapture=${(e) => { if (Date.now() - swipedAt.current < 400) { e.stopPropagation(); e.preventDefault(); } }}>
    ${side && html`<div class=${`swipe-bg ${dx > 0 ? 'from-left' : 'from-right'} tone-${side.tone} ${armed ? 'armed' : ''}`}>
      <${Icon} name=${side.icon} /><span>${side.label}</span></div>`}
    <div class=${`swipe-fg ${dx === 0 ? 'settle' : ''}`} style=${dx ? `transform:translateX(${dx}px)` : ''}>${children}</div>
  </div>`;
}

/** Drag-to-reorder by a handle. Returns props for each row's handle + per-row styles. */
function useReorder(ids, onCommit) {
  const [drag, setDrag] = useState(null);
  const els = useRef({});
  const st = useRef(null);
  const GAP = 10;

  function update() {
    const s = st.current;
    if (!s) return;
    const dy = s.lastY + scrollY - s.startY;
    const center = s.rects[s.from].top + dy + s.rects[s.from].h / 2;
    let to = 0;
    s.rects.forEach((r, i) => { if (i !== s.from && r.top + r.h / 2 < center) to++; });
    s.to = to;
    setDrag({ id: s.id, from: s.from, to, dy, h: s.rects[s.from].h });
  }
  function loop() {
    const s = st.current;
    if (!s) return;
    if (s.lastY < 90) scrollBy(0, -8);
    else if (s.lastY > innerHeight - 140) scrollBy(0, 8);
    update();
    s.raf = requestAnimationFrame(loop);
  }
  const start = (id) => (e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const rects = ids.map((i) => { const r = els.current[i].getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; });
    const from = ids.indexOf(id);
    st.current = { id, from, to: from, rects, startY: e.clientY + scrollY, lastY: e.clientY };
    navigator.vibrate?.(10);
    update();
    st.current.raf = requestAnimationFrame(loop);
  };
  const move = (e) => { if (st.current) { st.current.lastY = e.clientY; update(); } };
  const end = () => {
    const s = st.current;
    if (!s) return;
    cancelAnimationFrame(s.raf);
    st.current = null;
    setDrag(null);
    if (s.to !== s.from) {
      const next = ids.filter((x) => x !== s.id);
      next.splice(s.to, 0, s.id);
      onCommit(next);
    }
  };

  const handle = (id) => ({ onPointerDown: start(id), onPointerMove: move, onPointerUp: end, onPointerCancel: end });
  const rowRef = (id) => (el) => { if (el) els.current[id] = el; };
  const styleFor = (id, i) => {
    if (!drag) return '';
    if (id === drag.id) return `transform:translateY(${drag.dy}px);z-index:5;position:relative`;
    const shift = drag.h + GAP;
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return `transform:translateY(${-shift}px)`;
    if (drag.from > drag.to && i >= drag.to && i < drag.from) return `transform:translateY(${shift}px)`;
    return '';
  };
  return { handle, rowRef, styleFor, draggingId: drag?.id };
}

// ───────────────────────── data actions ─────────────────────────

function deleteItem(item, claims) {
  store.remove('items', item.id).catch(fail);
  if (item.hasPhoto) store.remove('photos', item.id).catch(fail);
  if (claims.some((c) => c.id === item.id)) store.remove('claims', item.id).catch(fail);
}

/** Removes a person, their items in every year (and photos/claims on them) and the claims they made. */
function deletePerson(person, { allItems, allClaims, people }, inheritorId) {
  for (const it of allItems.filter((i) => i.ownerId === person.id)) deleteItem(it, allClaims);
  for (const c of allClaims.filter((c) => c.claimerId === person.id)) store.remove('claims', c.id).catch(fail);
  for (const p of people.filter((p) => p.managedBy === person.id)) store.patch('people', p.id, { managedBy: inheritorId }).catch(fail);
  store.remove('people', person.id).catch(fail);
}

async function claimItem(item, me, year) {
  try {
    const r = await store.transact('claims', item.id, (cur) => (cur ? undefined : {
      ownerId: item.ownerId, claimerId: me.id, status: 'claimed', year, at: Date.now(),
    }));
    if (!r.ok) toast('Someone just claimed that one.', 'error');
    else toast(`Claimed "${item.title}"`);
  } catch {
    toast("Couldn't claim it. Check your connection and try again.", 'error');
  }
}
const setBought = (item, b) => store.patch('claims', item.id, { status: b ? 'bought' : 'claimed', at: Date.now() }).catch(fail);
const unclaim = (item) => { store.remove('claims', item.id).catch(fail); toast(`Unclaimed "${item.title}"`); };

// ───────────────────────── first-time setup ─────────────────────────

function SampleButton({ onLoaded, class: cls = 'btn block' }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm('Load a made-up family to try things out? This replaces everything currently saved.')) return;
    setBusy(true);
    try { onLoaded(await loadSample()); toast("You're Alex in the sample family"); } catch (e) { fail(e); } finally { setBusy(false); }
  }
  return html`<button class=${cls} disabled=${busy} onClick=${run}><${Icon} name="sparkles" /> ${busy ? 'Loading…' : 'Load sample family'}</button>`;
}

function Setup({ onSignIn, onSample }) {
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
      const year = lockDate.slice(0, 4);
      const res = await store.transact('settings', 'group', (cur) => (cur ? undefined : {
        name: groupName.trim() || 'Our Family', years: { [year]: { lockDate } }, admins: [id], createdAt: Date.now(),
      }));
      if (!res.ok) { toast('Someone already set this up. Pick your name.'); return; }
      store.put('people', id, { name: name.trim(), label: '', avatar, managedBy: null, createdAt: Date.now() }).catch(fail);
      onSignIn(id, year);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }

  return html`<main class="screen">
    <${PageHeader} eyebrow="Welcome to Santa Claude" title="Set up your family" />
    <p class="intro">Christmas lists for the whole family.</p>
    <form class="panel" onSubmit=${submit}>
      <h2>Your family</h2>
      <label class="field"><span>Group name</span>
        <input value=${groupName} onInput=${(e) => setGroupName(e.target.value)} maxlength="40" /></label>
      <label class="field"><span>Lists lock on</span>
        <input type="date" value=${lockDate} onChange=${(e) => setLockDate(e.target.value)} onInput=${(e) => setLockDate(e.target.value)} /></label>
      <p class="hint">Until then, everyone adds to their own list and can't see anyone else's. On this date lists lock and open up for shopping.</p>
      <h2>You</h2>
      <label class="field"><span>Your name</span>
        <input value=${name} onInput=${(e) => setName(e.target.value)} maxlength="30" autocomplete="given-name" /></label>
      <${AvatarPicker} value=${avatar} onChange=${setAvatar} />
      <p class="hint">You'll be the organizer and can change the lock date later.</p>
      <button class="btn primary block" disabled=${busy}>Start our lists</button>
    </form>
    ${!store.isLive && html`<p class="center muted small">Just looking around?</p>
    <${SampleButton} onLoaded=${onSample} />`}
  </main>`;
}

// ───────────────────────── sign in ─────────────────────────

function SignIn({ group, people, onSignIn }) {
  const [joining, setJoining] = useState(false);
  const selectable = people.filter((p) => !p.managedBy).sort(byName);
  if (joining) return html`<${JoinScreen} people=${people} onBack=${() => setJoining(false)} onSignIn=${onSignIn} />`;

  return html`<main class="screen">
    <${PageHeader} eyebrow=${group.name} title="Who are you?" />
    <p class="intro">Tap your name. This phone will remember you.</p>
    <div class="people-grid">
      ${selectable.map((p) => html`<button class="person-tile" key=${p.id} onClick=${() => onSignIn(p.id)}>
        <${Avatar} person=${p} size=${52} /><span>${p.name}</span></button>`)}
    </div>
    <button class="btn primary block" onClick=${() => setJoining(true)}><${Icon} name="userPlus" /> I'm new, sign me up</button>
  </main>`;
}

function JoinScreen({ people, onBack, onSignIn }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(M.AVATARS[Math.floor(Math.random() * M.AVATARS.length)]);
  const [label, setLabel] = useState('');

  function submit(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return toast('Add your name', 'error');
    if (people.some((p) => p.name.toLowerCase() === n.toLowerCase())) return toast(`${n} is already here. Go back and tap your name.`, 'error');
    const id = M.newId();
    store.put('people', id, { name: n, label: label.trim(), avatar, managedBy: null, createdAt: Date.now() }).catch(fail);
    onSignIn(id);
  }

  return html`<main class="screen narrow">
    <${PageHeader} eyebrow="Santa Claude" title="Sign up" />
    <form class="panel" onSubmit=${submit}>
      <label class="field"><span>Your name</span>
        <input value=${name} onInput=${(e) => setName(e.target.value)} maxlength="30" autocomplete="given-name" /></label>
      <label class="field"><span>Stocking Theme <em>(optional)</em></span>
        <input value=${label} onInput=${(e) => setLabel(e.target.value)} maxlength="40" /></label>
      <${AvatarPicker} value=${avatar} onChange=${setAvatar} />
      <button class="btn primary block">Join</button>
      <button type="button" class="btn block" onClick=${onBack}>Cancel</button>
    </form>
  </main>`;
}

// ───────────────────────── home ─────────────────────────

function YearPicker({ group, year, onYear }) {
  const years = M.yearList(group);
  if (years.length < 2) return html`<span class="year-pill static"><${Icon} name="calendar" size=${16} /> ${year}</span>`;
  return html`<label class="year-pill"><${Icon} name="calendar" size=${16} />
    <select value=${year} onChange=${(e) => onYear(e.target.value)} aria-label="Christmas year">
      ${years.map((y) => html`<option value=${y}>Christmas ${y}</option>`)}
    </select></label>`;
}

function LockBanner({ group, now }) {
  const when = M.fmtDate(group.lockDate, { weekday: 'short', month: 'short', day: 'numeric' });
  return M.isLocked(group, now)
    ? html`<div class="banner locked"><${Icon} name="gift" size=${22} />
        <div><b>Lists are locked. Happy shopping!</b><span>Claim what you'll buy so nobody doubles up.</span></div></div>`
    : html`<div class="banner open"><${Icon} name="calendar" size=${22} />
        <div><b>Lists lock ${when}</b><span>${M.timeLeft(group, now)} left to add to your list. Then everyone else can see it and start shopping.</span></div></div>`;
}

function Home({ me, group, people, items, claims, now, year, onYear, onSignOut }) {
  const locked = M.isLocked(group, now);
  const countFor = (pid) => items.filter((i) => i.ownerId === pid).length;
  const availableFor = (pid) => items.filter((i) => i.ownerId === pid && !claims.some((c) => c.id === i.id)).length;
  const managed = people.filter((p) => p.managedBy === me.id).sort(byName);
  const others = people.filter((p) => p.id !== me.id && p.managedBy !== me.id).sort(byName);
  const myClaims = claims.filter((c) => c.claimerId === me.id && items.some((i) => i.id === c.id));
  const toBuy = myClaims.filter((c) => c.status !== 'bought').length;

  const card = (p, sub, tag) => html`<a class="list-card" key=${p.id} href=${`#/list/${p.id}`}>
    <${Avatar} person=${p} />
    <span class="grow"><b>${p.id === me.id ? 'My list' : `${p.name}'s list`}</b><small>${sub}</small></span>
    ${tag && html`<span class="tag">${tag}</span>`}
    <span class="chev"><${Icon} name="chevron" /></span>
  </a>`;

  const otherSub = (p) => {
    const n = countFor(p.id);
    if (!locked) return `Opens ${M.fmtDate(group.lockDate)} · ${plural(n, 'item')} so far`;
    if (!n) return 'Nothing on this list';
    const a = availableFor(p.id);
    return a ? `${a} of ${plural(n, 'item')} still available` : n === 1 ? '1 item, claimed' : `All ${n} items claimed`;
  };

  return html`<main class="screen">
    <${PageHeader} eyebrow=${group.name} title=${`Hi, ${firstName(me)}`}
      right=${html`<button class="me-btn" onClick=${onSignOut} aria-label=${`Signed in as ${me.name}. Switch person`}>
        <${Avatar} person=${me} size=${44} /><small>Not you?</small></button>`} />
    <div class="row wrap year-row"><${YearPicker} group=${group} year=${year} onYear=${onYear} /></div>
    <${LockBanner} group=${group} now=${now} />

    <h2 class="section">Yours</h2>
    ${card(me, locked ? `${plural(countFor(me.id), 'item')} · locked` : `${plural(countFor(me.id), 'item')} · tap to add more`)}
    ${managed.map((p) => card(p, locked ? otherSub(p) : `${plural(countFor(p.id), 'item')} · you manage this list`, 'Managed'))}

    ${locked && html`<a class="list-card shopping" href="#/shopping">
      <span class="avatar icon-avatar" style="--size:44px"><${Icon} name="bag" size=${22} /></span>
      <span class="grow"><b>My shopping</b><small>${myClaims.length
        ? `${toBuy} to buy · ${myClaims.length - toBuy} bought`
        : 'Nothing claimed yet'}</small></span>
      <span class="chev"><${Icon} name="chevron" /></span></a>`}

    <h2 class="section">Family</h2>
    ${others.length
      ? others.map((p) => card(p, otherSub(p), locked ? null : html`<${Icon} name="lock" size=${14} />`))
      : html`<p class="muted empty">Nobody else yet. Send them the link to this page so they can sign up.</p>`}
  </main>`;
}

// ───────────────────────── a list ─────────────────────────

const PRICE_FILTERS = [[null, 'Any price'], [25, 'Under $25'], [50, 'Under $50'], [100, 'Under $100']];

function ListScreen({ personId, me, group, people, items, claims, now, year }) {
  const person = people.find((p) => p.id === personId);
  const [editing, setEditing] = useState(null); // null | 'new' | item
  const [show, setShow] = useState('all');
  const [maxPrice, setMaxPrice] = useState(null);
  const [picture, setPicture] = useState(false);
  const [importing, setImporting] = useState(false);
  const list = person ? M.sortItems(items.filter((i) => i.ownerId === person.id)) : [];
  const reorder = useReorder(list.map((i) => i.id), (ids) => {
    ids.forEach((id, i) => { if (list.find((x) => x.id === id)?.order !== i) store.patch('items', id, { order: i }).catch(fail); });
  });
  if (!person) return html`<main class="screen"><p class="muted">That list doesn't exist anymore.</p><a href="#/" class="btn">Go to Home</a></main>`;

  const mode = M.listMode(me, person, group, now);
  const own = person.id === me.id;
  const claimOf = (id) => claims.find((c) => c.id === id);
  const shown = mode !== 'shop' ? list : list.filter((i) => {
    const c = claimOf(i.id);
    if (show === 'available' && c) return false;
    if (show === 'mine' && c?.claimerId !== me.id) return false;
    if (maxPrice != null && (i.price == null || i.price > maxPrice)) return false;
    return true;
  });
  const lockWhen = longDate(group.lockDate);

  const intro = {
    edit: `Changes allowed until ${lockWhen}`,
    owner: 'Your list is locked. What people have bought is hidden, so no peeking!',
    shop: 'Swipe right to claim or mark bought, left to unclaim.',
  }[mode];

  return html`<main class="screen">
    <${PageHeader} eyebrow=${`Christmas ${year} · ${plural(list.length, 'item')}`}
      title=${own ? 'My list' : `${person.name}'s list`} right=${html`<${Avatar} person=${person} size=${44} />`} />
    ${person.label && html`<div class="theme page-theme"><${Icon} name="sock" size=${14} /> Stocking Theme: ${person.label}</div>`}

    ${mode === 'hidden'
      ? html`<div class="panel center locked-list">
          <span class="big-icon"><${Icon} name="lock" size=${40} /></span>
          <p><b>${firstName(person)}'s list opens ${lockWhen}.</b></p>
          <p class="muted">Lists stay private while people are still writing them.${list.length ? ` So far there ${list.length === 1 ? 'is 1 item' : `are ${list.length} items`}.` : ''}</p>
        </div>`
      : html`
        <p class="intro">${intro}</p>
        ${mode === 'edit' && html`<div class="row list-actions">
          <button class="btn primary grow" onClick=${() => setEditing('new')}><${Icon} name="plus" /> Add an item</button>
          <button class="btn magic" onClick=${() => setPicture(true)} aria-label="Share your list as a picture"><${Icon} name="sparkles" /> List</button>
        </div>
        <button class="link-btn import-link" onClick=${() => setImporting(true)}><${Icon} name="link" size=${16} /> Paste links from Amazon or other stores</button>`}
        ${mode === 'owner' && html`<button class="btn block magic list-actions" onClick=${() => setPicture(true)}><${Icon} name="sparkles" /> Share my list as a picture</button>`}
        ${mode === 'shop' && list.length > 0 && html`<div class="filters">
          <div class="chips">${[['all', 'All'], ['available', 'Available'], ['mine', 'Mine']].map(([k, l]) =>
            html`<button class=${`chip ${show === k ? 'on' : ''}`} onClick=${() => setShow(k)}>${l}</button>`)}</div>
          <div class="chips">${PRICE_FILTERS.map(([v, l]) =>
            html`<button class=${`chip ${maxPrice === v ? 'on' : ''}`} onClick=${() => setMaxPrice(v)}>${l}</button>`)}</div>
        </div>`}
        <div class="items">
          ${shown.map((it, i) => html`<${ItemRow} key=${it.id} item=${it} mode=${mode} me=${me} people=${people} year=${year}
            claim=${claimOf(it.id)} claims=${claims} onEdit=${() => setEditing(it)}
            handle=${mode === 'edit' ? reorder.handle(it.id) : null} rowRef=${reorder.rowRef(it.id)}
            style=${mode === 'edit' ? reorder.styleFor(it.id, i) : ''} dragging=${reorder.draggingId === it.id} />`)}
        </div>
        ${!list.length && html`<p class="muted empty center">${mode === 'edit' ? 'Nothing here yet. Add your first wish!' : 'Nothing on this list.'}</p>`}
        ${list.length > 0 && !shown.length && html`<p class="muted empty center">No items match these filters.</p>`}
      `}

    ${editing && html`<${ItemSheet} item=${editing === 'new' ? null : editing} owner=${person} me=${me} year=${year}
      nextOrder=${M.nextOrder(list)} onClose=${() => setEditing(null)}
      onDelete=${(id) => deleteItem(items.find((i) => i.id === id) || { id, hasPhoto: true }, claims)} />`}
    ${importing && html`<${ImportSheet} owner=${person} me=${me} year=${year} list=${list} onClose=${() => setImporting(false)} />`}
    ${picture && html`<${PictureSheet} person=${person} items=${list} year=${year} onClose=${() => setPicture(false)} />`}
  </main>`;
}

function ClaimPill({ claim, me, people }) {
  if (!claim) return null;
  const mine = claim.claimerId === me.id;
  const who = mine ? 'You' : firstName(people.find((p) => p.id === claim.claimerId));
  const bought = claim.status === 'bought';
  return html`<span class=${`pill ${bought ? 'bought' : 'claimed'} ${mine ? 'mine' : ''}`}>
    ${bought ? 'Bought' : 'Claimed'} · ${who}</span>`;
}

function ItemRow({ item, mode, me, people, claim, claims, year, onEdit, handle, rowRef, style, dragging }) {
  const [photo, setPhoto] = useState(false);
  const meta = M.itemMeta(item);
  const shop = mode === 'shop';
  const edit = mode === 'edit';
  const mine = claim?.claimerId === me.id;
  const takenByOther = shop && claim && !mine;
  const del = () => { if (confirm(`Delete "${item.title}"?`)) deleteItem(item, claims); };

  let left = null, right = null;
  if (edit) {
    left = item.priority
      ? { icon: 'star', label: 'Unpin', tone: 'gold', onAction: () => store.patch('items', item.id, { priority: false }).catch(fail) }
      : { icon: 'star', label: 'Really want', tone: 'gold', onAction: () => { store.patch('items', item.id, { priority: true }).catch(fail); toast('Pinned to the top'); } };
    right = { icon: 'trash', label: 'Delete', tone: 'red', onAction: del };
  } else if (shop && !claim) {
    left = { icon: 'gift', label: 'Claim', tone: 'gold', onAction: () => claimItem(item, me, year) };
  } else if (shop && mine) {
    left = claim.status === 'bought'
      ? { icon: 'undo', label: 'Not bought', tone: 'gold', onAction: () => setBought(item, false) }
      : { icon: 'check', label: 'Bought', tone: 'green', onAction: () => setBought(item, true) };
    right = { icon: 'x', label: 'Unclaim', tone: 'red', onAction: () => unclaim(item) };
  }

  return html`<${SwipeRow} left=${left} right=${right} rowRef=${rowRef} style=${style}
      class=${`item ${takenByOther ? 'taken' : ''} ${item.priority ? 'star' : ''} ${dragging ? 'dragging' : ''}`}>
    <div class=${`item-row ${edit ? 'tappable' : ''}`}
      onClick=${edit ? (e) => { if (!e.target.closest('a, button')) onEdit(); } : null}>
      ${handle && html`<button class="handle" aria-label="Drag to reorder" ...${handle}><${Icon} name="grip" /></button>`}
      ${item.thumb && html`<button class="thumb-btn" onClick=${() => item.hasPhoto && setPhoto(true)} aria-label="View photo">
        <img class="thumb" src=${item.thumb} alt="" /></button>`}
      <div class="grow item-main">
        <div class="item-title">${item.priority && html`<span class="star-ico" title="Really wants this"><${Icon} name="star" size=${15} /></span>`}${item.title}</div>
        ${meta && html`<div class="meta">${meta}</div>`}
        ${item.notes && html`<div class="notes">${item.notes}</div>`}
        ${(item.link || (shop && claim)) && html`<div class="item-foot">
          ${M.allLinks(item).map((l, i) => html`<a class=${`link-chip ${i ? 'alt' : ''}`} href=${l} target="_blank" rel="noopener noreferrer">
            <${Icon} name="external" size=${14} /> ${M.linkHost(l)}</a>`)}
          ${shop && html`<${ClaimPill} claim=${claim} me=${me} people=${people} />`}
        </div>`}
      </div>
      ${shop && html`<div class="row-actions">
        ${!claim && html`<button class="act claim" onClick=${() => claimItem(item, me, year)}><${Icon} name="gift" size=${18} /><small>Claim</small></button>`}
        ${mine && html`<button class=${`act ${claim.status === 'bought' ? 'done' : 'buy'}`}
          onClick=${() => setBought(item, claim.status !== 'bought')}><${Icon} name="check" size=${18} />
          <small>${claim.status === 'bought' ? 'Bought' : 'Bought?'}</small></button>`}
      </div>`}
    </div>
    ${photo && html`<${Lightbox} id=${item.id} onClose=${() => setPhoto(false)} />`}
  <//>`;
}

function ImportSheet({ owner, me, year, list, onClose }) {
  const [text, setText] = useState('');
  const [titles, setTitles] = useState({});
  const [skip, setSkip] = useState({});
  const have = new Set(list.flatMap((i) => M.allLinks(i)).map((l) => M.linkKey(l)));
  const { drafts, warnings } = M.parsePastedLinks(text);
  const rows = drafts.map((d) => ({ ...d, dupe: have.has(d.key), title: titles[d.key] ?? d.title }));
  const chosen = rows.filter((r) => !r.dupe && !skip[r.key] && r.title.trim());

  async function pasteClipboard() {
    try { const t = await navigator.clipboard.readText(); setText((cur) => (cur ? `${cur}\n${t}` : t)); }
    catch { toast('Long-press the box and tap Paste instead', 'error'); }
  }
  function add() {
    let order = M.nextOrder(list);
    const t = Date.now();
    chosen.forEach((r, i) => {
      store.put('items', M.newId(), {
        ownerId: owner.id, year, title: r.title.trim(), link: r.link, notes: '', price: null, qty: 1, size: '', color: '',
        priority: false, thumb: null, hasPhoto: false, order: order++, createdAt: t + i, addedBy: me.id, updatedAt: t,
      }).catch(fail);
    });
    toast(`Added ${plural(chosen.length, 'item')}. Tap one to add a price or notes.`);
    onClose();
  }

  return html`<${Sheet} title="Paste links" onClose=${onClose}>
    <p class="hint">Copy product links from Amazon (or any store) and paste them here, as many as you like. Each one becomes an item. Short "a.co" links don't include the product name, so rename those below.</p>
    <label class="field"><span class="row">Links <button type="button" class="link-btn small-link" onClick=${pasteClipboard}>Paste from clipboard</button></span>
      <textarea rows="4" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="https://www.amazon.com/…"
        autocapitalize="off" autocorrect="off" spellcheck="false"></textarea></label>
    ${warnings.map((w) => html`<p class="field-error">${w}</p>`)}
    ${rows.length > 0 && html`<div class="import-list">
      ${rows.map((r) => html`<div class=${`import-row ${r.dupe || skip[r.key] ? 'off' : ''}`} key=${r.key}>
        <input type="checkbox" checked=${!r.dupe && !skip[r.key]} disabled=${r.dupe} aria-label="Include"
          onChange=${(e) => setSkip({ ...skip, [r.key]: !e.target.checked })} />
        <div class="grow">
          <input class="import-title" value=${r.title} disabled=${r.dupe} onInput=${(e) => setTitles({ ...titles, [r.key]: e.target.value })} />
          <small class="muted">${r.dupe ? 'Already on this list' : M.linkHost(r.link)}</small>
        </div>
      </div>`)}
    </div>`}
    <button class="btn primary block" disabled=${!chosen.length} onClick=${add}>
      <${Icon} name="plus" /> ${chosen.length ? `Add ${plural(chosen.length, 'item')}` : 'Add items'}</button>
  <//>`;
}

function PictureSheet({ person, items, year, onClose }) {
  const [blob, setBlob] = useState(null);
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let u = null;
    listPicture({ person, items, year })
      .then((b) => { setBlob(b); u = URL.createObjectURL(b); setUrl(u); })
      .catch((e) => setErr(e.message));
    return () => u && URL.revokeObjectURL(u);
  }, []);
  const name = `${firstName(person)}'s Christmas list ${year}.png`;
  return html`<${Sheet} title="Your list as a picture" onClose=${onClose}>
    <div class="picture-preview">
      ${url ? html`<img src=${url} alt=${`${person.name}'s Christmas list`} />` : html`<p class="muted center">${err || 'Making your picture…'}</p>`}
    </div>
    <button class="btn primary block" disabled=${!blob} onClick=${async () => {
      const r = await shareOrDownload(blob, name, `${firstName(person)}'s Christmas list`);
      if (r === 'downloaded') toast('Picture downloaded');
    }}><${Icon} name="share" /> Share or save</button>
    <p class="hint center">On iPhone, tap Share then "Save Image" to put it in Photos.</p>
  <//>`;
}

function Lightbox({ id, onClose }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { store.getOne('photos', id).then((p) => setSrc(p?.full || '')); }, [id]);
  return html`<div class="lightbox" onClick=${onClose}>
    ${src === null ? html`<p>Loading…</p>` : src ? html`<img src=${src} alt="" />` : html`<p>Photo not found.</p>`}
  </div>`;
}

function ItemSheet({ item, owner, me, year, nextOrder, onClose, onDelete }) {
  const id = useRef(item?.id || M.newId()).current;
  const created = useRef(!!item);
  const [f, setF] = useState(() => ({
    title: item?.title || '', links: M.allLinks(item).length ? M.allLinks(item) : [''], notes: item?.notes || '',
    price: item?.price != null ? String(item.price) : '', qty: item?.qty || 1,
    size: item?.size || '', color: item?.color || '', priority: !!item?.priority,
  }));
  const [thumb, setThumb] = useState(item?.thumb || null);
  const pendingPhoto = useRef(null); // {full} | 'remove' | null
  const [more, setMore] = useState(!!(item && (item.price != null || item.size || item.color || item.qty > 1)));
  const [busy, setBusy] = useState(false);
  const titleRef = useRef();
  useEffect(() => { if (!item) setTimeout(() => titleRef.current?.focus(), 80); }, []);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((cur) => ({ ...cur, [k]: v }));
  };
  const setLinks = (fn) => setF((cur) => ({ ...cur, links: fn(cur.links) }));
  const isBad = (l) => !!l.trim() && !M.normalizeLink(l);

  const [status, cancelSave] = useAutosave({ f, thumb }, ({ f, thumb }) => {
    const title = f.title.trim();
    if (!title) return false; // nothing to save until it has a name
    const fields = {
      title, ...M.splitLinks(f.links), notes: f.notes.trim(),
      price: M.parsePrice(f.price), qty: Math.max(1, parseInt(f.qty, 10) || 1),
      size: f.size.trim(), color: f.color.trim(), priority: f.priority,
      thumb: thumb || null, hasPhoto: !!thumb, updatedAt: Date.now(),
    };
    if (created.current) {
      store.patch('items', id, fields).catch(fail);
    } else {
      store.put('items', id, {
        ...fields, ownerId: owner.id, year, order: nextOrder, createdAt: Date.now(), addedBy: me.id,
      }).catch(fail);
      created.current = true;
      toast('Added to the list');
    }
    const p = pendingPhoto.current;
    pendingPhoto.current = null;
    if (p === 'remove') store.remove('photos', id).catch(fail);
    else if (p) store.put('photos', id, { full: p.full, ownerId: owner.id }).catch(fail);
  });

  async function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const p = await processPhoto(file);
      pendingPhoto.current = { full: p.full };
      setThumb(p.thumb);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }
  const removePhoto = () => { pendingPhoto.current = item?.hasPhoto || created.current ? 'remove' : null; setThumb(null); };

  return html`<${Sheet} title=${item ? 'Edit item' : 'Add an item'} onClose=${onClose}
      status=${busy ? 'Processing photo…' : !f.title.trim() ? (item ? 'Needs a name' : '') : status}>
    <form onSubmit=${(e) => e.preventDefault()}>
      <label class="field"><span>What is it?</span>
        <input value=${f.title} onInput=${set('title')} maxlength="120" placeholder="e.g. Cozy slippers" ref=${titleRef} enterkeyhint="done" /></label>
      <div class="field"><span>Links <em>(optional)</em></span>
        ${f.links.map((l, i) => html`<div class="link-edit" key=${i}>
          <div class="row">
            <input type="text" inputmode="url" autocapitalize="off" autocorrect="off" value=${l}
              aria-label=${i === 0 ? 'Primary link' : `Link ${i + 1}`}
              placeholder=${i === 0 ? 'Paste a link to the product' : 'Another place to buy it'}
              onInput=${(e) => { const v = e.target.value; setLinks((ls) => ls.map((x, j) => (j === i ? v : x))); }} />
            ${f.links.length > 1 && html`<button type="button" class="icon-btn" aria-label="Remove link"
              onClick=${() => setLinks((ls) => ls.filter((_, j) => j !== i))}><${Icon} name="x" size=${18} /></button>`}
          </div>
          ${i === 0 && f.links.length > 1 && html`<small class="link-tag">Primary link</small>`}
          ${i > 0 && l.trim() && !isBad(l) && html`<button type="button" class="link-btn small-link make-primary"
            onClick=${() => setLinks((ls) => [ls[i], ...ls.filter((_, j) => j !== i)])}><${Icon} name="star" size=${14} /> Make primary</button>`}
          ${isBad(l) && html`<small class="field-error">That link doesn't look right, so it won't be saved.</small>`}
        </div>`)}
        <button type="button" class="link-btn" onClick=${() => setLinks((ls) => [...ls, ''])}><${Icon} name="plus" size=${16} /> Add another link</button>
      </div>
      <label class="field"><span>Notes <em>(optional)</em></span>
        <textarea rows="3" value=${f.notes} onInput=${set('notes')} maxlength="1000"
          placeholder="Any store, style, or other details"></textarea></label>
      <label class="toggle"><input type="checkbox" checked=${f.priority} onChange=${set('priority')} />
        <span class="row"><${Icon} name="star" size=${18} /> I really want this (pins it to the top)</span></label>

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
        : html`<button type="button" class="link-btn" onClick=${() => setMore(true)}><${Icon} name="plus" size=${16} /> Price, quantity, size, color</button>`}

      <div class="photo-field">
        ${thumb && html`<img class="thumb big" src=${thumb} alt="" />`}
        <label class="btn"><${Icon} name="camera" /> ${thumb ? 'Change photo' : 'Add photo'}
          <input type="file" accept="image/*" hidden onChange=${pickPhoto} /></label>
        ${thumb && html`<button type="button" class="btn" onClick=${removePhoto}>Remove</button>`}
      </div>
      <p class="hint">Changes save automatically. Swipe down or tap Done when you're finished.</p>
      ${(item || f.title.trim()) && html`<button type="button" class="btn danger block delete-btn" onClick=${() => {
        if (!confirm(`Delete "${f.title.trim() || item?.title || 'this item'}"?`)) return;
        cancelSave();
        if (created.current) onDelete(id);
        onClose();
      }}><${Icon} name="trash" /> Delete item</button>`}
    </form>
  <//>`;
}

// ───────────────────────── shopping ─────────────────────────

function Shopping({ me, group, people, items, claims, now, year }) {
  const [exporting, setExporting] = useState(false);
  useEffect(() => { loadXLSX().catch(() => {}); }, []); // warm up so the share sheet opens straight away
  async function exportExcel() {
    setExporting(true);
    try {
      const rows = mine.map(({ c, item }) => ({ claim: c, item, person: people.find((p) => p.id === item.ownerId) || { name: '?' } }));
      const blob = await shoppingWorkbook(rows, { year, shopper: me });
      const r = await shareOrDownload(blob, `Christmas ${year} shopping - ${firstName(me)}.xlsx`, `Christmas ${year} shopping`);
      if (r === 'downloaded') toast('Spreadsheet downloaded');
    } catch (e) {
      toast("Couldn't make the spreadsheet. Check your connection and try again.", 'error');
    } finally {
      setExporting(false);
    }
  }
  const mine = claims.filter((c) => c.claimerId === me.id)
    .map((c) => ({ c, item: items.find((i) => i.id === c.id) })).filter((x) => x.item);
  const toBuy = mine.filter((x) => x.c.status !== 'bought');
  const total = mine.reduce((s, x) => s + (x.item.price || 0) * (x.item.qty || 1), 0);
  const owners = [...new Set(mine.map((x) => x.item.ownerId))]
    .map((id) => people.find((p) => p.id === id)).filter(Boolean).sort(byName);

  return html`<main class="screen">
    <${PageHeader} eyebrow=${`Christmas ${year}`} title="My shopping" />
    ${mine.length > 0 && html`<p class="intro">Swipe right to mark bought, left to unclaim.</p>
      <button class="btn block excel list-actions" disabled=${exporting} onClick=${exportExcel}>
        <${Icon} name="sheet" /> ${exporting ? 'Making spreadsheet…' : 'Export to Excel'}</button>`}
    ${!mine.length
      ? html`<p class="muted empty">${M.isLocked(group, now)
          ? "You haven't claimed anything yet. Open someone's list and swipe right on an item to claim it."
          : `Shopping opens ${longDate(group.lockDate)}, when lists lock.`}</p>`
      : html`
        <div class="stats">
          <div><b>${toBuy.length}</b><small>to buy</small></div>
          <div><b>${mine.length - toBuy.length}</b><small>bought</small></div>
          ${total > 0 && html`<div><b>${M.fmtPrice(Math.round(total))}</b><small>est. total</small></div>`}
        </div>
        ${owners.map((p) => html`<section key=${p.id} class="shop-group">
          <h2 class="section row"><${Avatar} person=${p} size=${26} /><a href=${`#/list/${p.id}`}>For ${p.name}</a></h2>
          <div class="items">
          ${mine.filter((x) => x.item.ownerId === p.id).map(({ c, item }) => {
            const bought = c.status === 'bought';
            return html`<${SwipeRow} key=${item.id} class="item"
              left=${bought ? { icon: 'undo', label: 'Not bought', tone: 'gold', onAction: () => setBought(item, false) }
                : { icon: 'check', label: 'Bought', tone: 'green', onAction: () => setBought(item, true) }}
              right=${{ icon: 'x', label: 'Unclaim', tone: 'red', onAction: () => unclaim(item) }}>
              <div class="item-row">
                <button class=${`check ${bought ? 'on' : ''}`} onClick=${() => setBought(item, !bought)}
                  aria-label=${bought ? 'Mark not bought' : 'Mark bought'}><${Icon} name="check" size=${16} /></button>
                <div class="grow item-main">
                  <div class=${`item-title ${bought ? 'done' : ''}`}>${item.title}</div>
                  ${M.itemMeta(item) && html`<div class="meta">${M.itemMeta(item)}</div>`}
                  ${item.notes && html`<div class="notes">${item.notes}</div>`}
                </div>
                ${item.link && html`<a class="icon-btn" href=${item.link} target="_blank" rel="noopener noreferrer" aria-label="Open link"><${Icon} name="external" /></a>`}
              </div>
            <//>`;
          })}
          </div>
        </section>`)}
      `}
  </main>`;
}

// ───────────────────────── family ─────────────────────────

function PersonSheet({ person, title, onSave, onClose, children }) {
  const [d, setD] = useState({ name: person?.name || '', label: person?.label || '', avatar: person?.avatar || '🧸' });
  const set = (k) => (v) => setD((cur) => ({ ...cur, [k]: v }));
  const [status] = useAutosave(d, (d) => {
    const name = d.name.trim();
    if (!name) return false;
    onSave({ name, label: d.label.trim(), avatar: d.avatar });
  });
  return html`<${Sheet} title=${title} onClose=${onClose} status=${d.name.trim() ? status : person ? 'Needs a name' : ''}>
    <form onSubmit=${(e) => e.preventDefault()}>
      <label class="field"><span>Name</span><input value=${d.name} onInput=${(e) => set('name')(e.target.value)} maxlength="30" enterkeyhint="done" /></label>
      <label class="field"><span>Stocking Theme <em>(optional)</em></span>
        <input value=${d.label} onInput=${(e) => set('label')(e.target.value)} maxlength="40" enterkeyhint="done" /></label>
      <${AvatarPicker} value=${d.avatar} onChange=${set('avatar')} />
    </form>
    ${children}
  <//>`;
}

function AddListSheet({ me, onClose }) {
  const id = useRef(M.newId()).current;
  const created = useRef(false);
  return html`<${PersonSheet} title="Add a list for someone" onClose=${onClose}
    onSave=${(d) => {
      if (created.current) { store.patch('people', id, d).catch(fail); return; }
      created.current = true;
      store.put('people', id, { ...d, managedBy: me.id, createdAt: Date.now() }).catch(fail);
      toast(`Added ${d.name}. Open their list to add items.`);
    }} />`;
}

function Family({ me, group, people, items, allItems, allClaims }) {
  const [editing, setEditing] = useState(null); // person | 'add'
  const admin = M.isAdmin(group, me);
  const admins = group.admins || [];
  const canEditPerson = (p) => admin || M.canEdit(me, p);
  const sorted = [...people].sort((a, b) => (a.id === me.id ? -1 : b.id === me.id ? 1 : byName(a, b)));

  const sub = (p) => [
    p.managedBy ? `Managed by ${p.managedBy === me.id ? 'you' : firstName(people.find((x) => x.id === p.managedBy))}` : '',
    plural(items.filter((i) => i.ownerId === p.id).length, 'item'),
  ].filter(Boolean).join(' · ');

  const removePerson = (p) => {
    const n = allItems.filter((i) => i.ownerId === p.id).length;
    if (!confirm(`Remove ${p.name}? This deletes their lists (${plural(n, 'item')} across all years) and anything they've claimed. This can't be undone.`)) return;
    deletePerson(p, { allItems, allClaims, people }, me.id);
    setEditing(null);
  };
  const toggleAdmin = (p) => store.patch('settings', 'group', {
    admins: admins.includes(p.id) ? admins.filter((x) => x !== p.id) : [...admins, p.id],
  }).catch(fail);

  const ed = editing && editing !== 'add' ? people.find((p) => p.id === editing.id) : null;
  const canRemove = ed && ed.id !== me.id && (admin || ed.managedBy === me.id);

  return html`<main class="screen">
    <${PageHeader} eyebrow=${`${group.name} · ${people.length} ${people.length === 1 ? 'person' : 'people'}`} title="Family" />
    ${sorted.map((p) => html`<div class="member" key=${p.id}>
      <a href=${`#/list/${p.id}`}><${Avatar} person=${p} size=${48} /></a>
      <a class="grow member-main" href=${`#/list/${p.id}`}>
        <b>${p.name}${p.id === me.id ? ' (you)' : ''}${admins.includes(p.id) && html` <span class="tag"><${Icon} name="crown" size=${12} /> Organizer</span>`}</b>
        ${p.label && html`<span class="theme"><${Icon} name="sock" size=${14} /> Stocking Theme: ${p.label}</span>`}
        <small>${sub(p)}</small>
      </a>
      ${canEditPerson(p) && html`<button class="icon-btn" onClick=${() => setEditing(p)} aria-label=${`Edit ${p.name}`}><${Icon} name="pencil" /></button>`}
    </div>`)}
    <button class="btn block" onClick=${() => setEditing('add')}><${Icon} name="userPlus" /> Add a list for someone without a phone</button>
    <p class="hint center gap-top">Anyone else can join by opening this site and tapping "I'm new, sign me up".</p>

    ${editing === 'add' && html`<${AddListSheet} me=${me} onClose=${() => setEditing(null)} />`}
    ${ed && html`<${PersonSheet} title=${ed.id === me.id ? 'Edit you' : `Edit ${ed.name}`} person=${ed}
      onClose=${() => setEditing(null)} onSave=${(d) => store.patch('people', ed.id, d).catch(fail)}>
      ${((admin && ed.id !== me.id && !ed.managedBy) || canRemove) && html`<div class="sheet-extra">
        <h3 class="section">Organizer tools</h3>
        <div class="row wrap">
          ${admin && ed.id !== me.id && !ed.managedBy && html`<button class="btn small" onClick=${() => toggleAdmin(ed)}>
            <${Icon} name="crown" size=${16} /> ${admins.includes(ed.id) ? 'Remove organizer' : 'Make organizer'}</button>`}
          ${canRemove && html`<button class="btn small danger" onClick=${() => removePerson(ed)}><${Icon} name="trash" size=${16} /> Remove ${firstName(ed)}</button>`}
        </div>
      </div>`}
    <//>`}
  </main>`;
}

// ───────────────────────── settings ─────────────────────────

function Settings({ me, group, rawGroup, people, items, claims, now, year, onYear, onSignOut, onSample }) {
  const [sheet, setSheet] = useState(null);
  const admin = M.isAdmin(group, me);
  const admins = people.filter((p) => (group.admins || []).includes(p.id));
  const locked = M.isLocked(group, now);
  const years = M.yearList(rawGroup);

  const setLockDate = (v) => {
    if (!v || v === group.lockDate) return;
    store.patch('settings', 'group', { [`years.${year}.lockDate`]: v }).catch(fail);
    toast(`Christmas ${year} lists now lock ${M.fmtDate(v, { weekday: 'short', month: 'short', day: 'numeric' })}`);
  };
  const saveName = (v) => { const n = v.trim(); if (n && n !== group.name) store.patch('settings', 'group', { name: n }).catch(fail); };
  const newYear = () => {
    const y = String(Math.max(...years.map(Number)) + 1);
    if (!confirm(`Start Christmas ${y}? Everyone gets a fresh, empty list. Earlier years stay viewable from the year picker.`)) return;
    store.patch('settings', 'group', { [`years.${y}`]: { lockDate: `${y}-12-01` } }).catch(fail);
    onYear(y);
    toast(`Christmas ${y} started. Lists lock Dec 1.`);
  };
  const deleteYear = () => {
    if (!confirm(`Delete Christmas ${year} and all its lists and claims for everyone? This can't be undone.`)) return;
    for (const it of items) deleteItem(it, claims);
    for (const c of claims) store.remove('claims', c.id).catch(fail);
    store.patch('settings', 'group', { [`years.${year}`]: store.DELETE }).catch(fail);
    onYear(years.find((y) => y !== year));
    toast(`Christmas ${year} deleted`);
  };

  return html`<main class="screen">
    <${PageHeader} eyebrow=${group.name} title="Settings" />

    <section class="panel">
      <h2>You</h2>
      <div class="row"><${Avatar} person=${me} />
        <span class="grow"><b>${me.name}</b>${me.label && html`<small class="muted block">Stocking Theme: ${me.label}</small>`}</span>
        <button class="icon-btn" onClick=${() => setSheet('me')} aria-label="Edit you"><${Icon} name="pencil" /></button></div>
      <button class="btn block" onClick=${onSignOut}><${Icon} name="switch" /> Switch person</button>
    </section>

    <section class="panel">
      <h2>Christmas year</h2>
      <div class="row wrap"><${YearPicker} group=${rawGroup} year=${year} onYear=${onYear} /></div>
      <p class="hint">${locked ? `Christmas ${year} lists are locked for shopping.` : `Christmas ${year} lists are open for editing.`}</p>
      ${admin
        ? html`
          <label class="field"><span>Lists lock on</span>
            <input type="date" value=${group.lockDate} onChange=${(e) => setLockDate(e.target.value)} /></label>
          <div class="row wrap">
            ${locked
              ? html`<button class="btn" onClick=${() => setLockDate(M.isoDate(1))}><${Icon} name="unlock" /> Reopen until tomorrow</button>`
              : html`<button class="btn" onClick=${() => setLockDate(M.isoDate(0))}><${Icon} name="lock" /> Lock lists now</button>`}
          </div>
          <p class="hint">Changes save right away and apply to everyone.</p>
          <div class="row wrap">
            <button class="btn" onClick=${newYear}><${Icon} name="plus" /> Start next Christmas</button>
            ${years.length > 1 && html`<button class="btn danger" onClick=${deleteYear}><${Icon} name="trash" /> Delete ${year}</button>`}
          </div>`
        : html`<p>Lists lock on <b>${M.fmtDate(group.lockDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b>.</p>
          <p class="hint">Organizer${admins.length === 1 ? '' : 's'}: ${admins.map((a) => a.name).join(', ') || 'none'}. They can change the date and start a new year.</p>`}
    </section>

    ${admin && html`<section class="panel">
      <h2>Group</h2>
      <label class="field"><span>Group name</span>
        <input value=${group.name} onChange=${(e) => saveName(e.target.value)} maxlength="40" /></label>
    </section>`}

    ${!store.isLive && html`<section class="panel">
      <h2>Try it out</h2>
      <p class="hint">Replace everything with a made-up family (with this year and last year) to see how it all works. Use "Switch person" to see it as someone else.</p>
      <${SampleButton} onLoaded=${onSample} class="btn" />
    </section>`}

    <p class="muted small center">${store.isLive ? 'Live sync on' : 'Demo mode: saved on this device only'}</p>

    ${sheet === 'me' && html`<${PersonSheet} title="Edit you" person=${me} onClose=${() => setSheet(null)}
      onSave=${(d) => store.patch('people', me.id, d).catch(fail)} />`}
  </main>`;
}

// ───────────────────────── shell ─────────────────────────

function TabBar({ me, route }) {
  const tab = route[0] === 'list' && route[1] === me.id ? 'mine' : route[0] || 'home';
  const tabs = [
    ['home', '#/', 'home', 'Home'],
    ['mine', `#/list/${me.id}`, 'list', 'My list'],
    ['shopping', '#/shopping', 'bag', 'Shopping'],
    ['family', '#/family', 'users', 'Family'],
    ['settings', '#/settings', 'settings', 'Settings'],
  ];
  return html`<nav class="tabbar">${tabs.map(([k, href, ico, label]) =>
    html`<a href=${href} class=${tab === k ? 'on' : ''} aria-current=${tab === k ? 'page' : null}>
      <${Icon} name=${ico} size=${22} /><small>${label}</small></a>`)}</nav>`;
}

function App() {
  const route = useHash();
  const now = useNow();
  const [meId, setMeId] = useState(() => loadKey(ME_KEY));
  const [yearPref, setYearPref] = useState(() => loadKey(YEAR_KEY));
  const group = useWatch((cb) => store.watchDoc('settings', 'group', cb), []);
  const people = useWatch((cb) => store.watchAll('people', cb), []);
  const allItems = useWatch((cb) => store.watchAll('items', cb), []);
  const allClaims = useWatch((cb) => store.watchAll('claims', cb), []);

  const signIn = (id, year) => { saveKey(ME_KEY, id); setMeId(id); if (year) chooseYear(year); go('/'); };
  const signOut = () => { saveKey(ME_KEY, null); setMeId(null); go('/'); };
  const chooseYear = (y) => { saveKey(YEAR_KEY, y); setYearPref(y); };
  const onSample = ({ me, year }) => signIn(me, year);

  let body;
  if (group === undefined || people === undefined || allItems === undefined || allClaims === undefined) {
    body = html`<main class="screen"><p class="muted center">Loading…</p></main>`;
  } else if (group === null) {
    body = html`<${Setup} onSignIn=${signIn} onSample=${onSample} />`;
  } else {
    const me = people.find((p) => p.id === meId && !p.managedBy);
    if (!me) {
      body = html`<${SignIn} group=${group} people=${people} onSignIn=${signIn} />`;
    } else {
      const years = M.yearList(group);
      const year = years.includes(yearPref) ? yearPref : years[0];
      const g = M.groupForYear(group, year);
      const items = allItems.filter((i) => M.yearOfDoc(i, group) === year);
      const claims = allClaims.filter((c) => M.yearOfDoc(c, group) === year);
      const props = { me, group: g, rawGroup: group, people, items, claims, allItems, allClaims, now, year, onYear: chooseYear };
      const screen = route[0] === 'list' ? html`<${ListScreen} ...${props} personId=${route[1]} />`
        : route[0] === 'shopping' ? html`<${Shopping} ...${props} />`
        : route[0] === 'family' ? html`<${Family} ...${props} />`
        : route[0] === 'settings' ? html`<${Settings} ...${props} onSignOut=${signOut} onSample=${onSample} />`
        : html`<${Home} ...${props} onSignOut=${signOut} />`;
      body = html`${screen}<${TabBar} me=${me} route=${route} />`;
    }
  }

  return html`${!store.isLive && html`<div class="demo-bar">Demo mode: saved on this device only</div>`}${body}<${Toasts} />`;
}

render(html`<${App} />`, document.getElementById('app'));
