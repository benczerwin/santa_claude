// Exports: a shareable picture of a wish list, and the shopping list as an Excel file.
import * as M from './model.js';
import { isIcon, avatarSVG } from './avatars.js';

function loadSVG(svg) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

// ── sharing ──

/** Phones get the share sheet (Save Image, Save to Files, Excel…); computers get a download. */
export async function shareOrDownload(blob, filename, title) {
  const file = new File([blob], filename, { type: blob.type });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
      // NotAllowedError etc: fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}

// ── list picture ──

const W = 1080;
const PAD = 64;
const CARD_X = 56;
const CARD_W = W - CARD_X * 2;
const TEXT_X = CARD_X + 116;
const TEXT_W = CARD_W - 116 - 48;
const DISPLAY = '"Mountains of Christmas", Georgia, serif';
const BODY = 'Nunito, system-ui, -apple-system, sans-serif';
const MAX_ITEMS = 30;

/**
 * One line, never wrapped: shrinks the font from maxPx toward minPx until it fits,
 * then trims with "…" if it still doesn't. -> { text, font }
 */
function fitLine(ctx, text, maxW, style, maxPx, minPx) {
  const t = String(text).replace(/\s+/g, ' ').trim();
  let px = maxPx;
  const font = () => `${style} ${px}px ${BODY}`;
  ctx.font = font();
  while (px > minPx && ctx.measureText(t).width > maxW) { px -= 1; ctx.font = font(); }
  if (ctx.measureText(t).width <= maxW) return { text: t, font: font() };
  let cut = t;
  while (cut && ctx.measureText(`${cut}…`).width > maxW) cut = cut.slice(0, -1);
  return { text: `${cut.trimEnd()}…`, font: font() };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  ctx.closePath();
}

/** Lays out every row; returns heights so the canvas can be sized before drawing. */
function layout(ctx, items) {
  return items.map((it) => {
    const title = fitLine(ctx, it.title, TEXT_W, '800', 40, 30);
    const all = M.allLinks(it);
    const link = all.length ? `${M.linkHost(all[0])}${all.length > 1 ? ` +${all.length - 1}` : ''}` : '';
    const metaLine = [M.itemMeta(it), link].filter(Boolean).join(' · ');
    const meta = metaLine ? fitLine(ctx, metaLine, TEXT_W, '700', 29, 24) : null;
    const notes = it.notes ? fitLine(ctx, it.notes, TEXT_W, 'italic 600', 29, 24) : null;
    const h = 34 + 50 + (meta ? 40 : 0) + (notes ? 38 : 0) + 30;
    return { it, title, meta, notes, h };
  });
}

/** -> PNG Blob of a festive card listing the person's wishes. */
export async function listPicture({ person, items, year }) {
  await Promise.all([
    document.fonts.load(`700 96px ${DISPLAY}`),
    document.fonts.load(`800 40px ${BODY}`),
    document.fonts.load(`700 29px ${BODY}`),
  ]).catch(() => {});

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const shown = items.slice(0, MAX_ITEMS);
  const rows = layout(ctx, shown);
  const extra = items.length - shown.length;

  const headerH = 470 + (person.label ? 60 : 0);
  const listH = rows.reduce((s, r) => s + r.h, 0) + (extra > 0 ? 70 : 0) + (rows.length ? 30 : 160);
  const H = headerH + listH + 170;
  canvas.width = W;
  canvas.height = H;

  // background
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d0333a');
  g.addColorStop(1, '#8c1b21');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < Math.round(H / 9); i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.22})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 2 + rnd() * 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // header
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const art = isIcon(person.avatar) ? await loadSVG(avatarSVG(person.avatar)).catch(() => null) : null;
  if (art) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(W / 2, 150, 92, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(art, W / 2 - 92, 58, 184, 184);
    ctx.restore();
  } else {
    ctx.fillStyle = '#fbf0d4';
    ctx.beginPath();
    ctx.arc(W / 2, 150, 92, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `110px ${BODY}`;
    ctx.textBaseline = 'middle';
    ctx.fillText(person.avatar || '🎁', W / 2, 158);
  }
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.font = `700 96px ${DISPLAY}`;
  const name = person.name.split(' ')[0];
  let titleText = `${name}'s Christmas List`;
  if (ctx.measureText(titleText).width > W - PAD * 2) ctx.font = `700 76px ${DISPLAY}`;
  if (ctx.measureText(titleText).width > W - PAD * 2) titleText = `${name}'s List`;
  ctx.fillText(titleText, W / 2, 350);
  ctx.font = `800 34px ${BODY}`;
  ctx.fillStyle = '#ffe2a6';
  ctx.fillText(`CHRISTMAS ${year}  ·  ${items.length} WISH${items.length === 1 ? '' : 'ES'}`, W / 2, 410);
  if (person.label) {
    const theme = fitLine(ctx, `Stocking Theme: ${person.label}`, W - PAD * 2, '700', 32, 24);
    ctx.font = theme.font;
    ctx.fillStyle = '#fff';
    ctx.fillText(theme.text, W / 2, 466);
  }

  // card
  const cardY = headerH;
  const cardH = listH;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#fffaf2';
  roundRect(ctx, CARD_X, cardY, CARD_W, cardH, 40);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'left';
  let y = cardY + 30;
  if (!rows.length) {
    ctx.font = `700 36px ${BODY}`;
    ctx.fillStyle = '#7a6a60';
    ctx.textAlign = 'center';
    ctx.fillText('Nothing on the list yet!', W / 2, y + 80);
    ctx.textAlign = 'left';
  }
  rows.forEach((r, i) => {
    const top = y;
    let ty = top + 34 + 36;
    // marker
    const mx = CARD_X + 62, my = top + 34 + 22;
    if (r.it.priority) {
      ctx.fillStyle = '#e9b64a';
      star(ctx, mx, my, 26);
      ctx.fill();
    } else {
      ctx.fillStyle = '#e3f1e8';
      ctx.beginPath();
      ctx.arc(mx, my, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1d6b45';
      ctx.font = `900 26px ${BODY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), mx, my + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    ctx.fillStyle = '#2a1d18';
    ctx.font = r.title.font;
    ctx.fillText(r.title.text, TEXT_X, ty);
    ty += 50;
    if (r.meta) {
      ctx.fillStyle = '#c42b32';
      ctx.font = r.meta.font;
      ctx.fillText(r.meta.text, TEXT_X, ty - 8);
      ty += 40;
    }
    if (r.notes) {
      ctx.fillStyle = '#7a6a60';
      ctx.font = r.notes.font;
      ctx.fillText(r.notes.text, TEXT_X, ty - 8);
      ty += 38;
    }
    y = top + r.h;
    if (i < rows.length - 1) {
      ctx.strokeStyle = '#eadfce';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(TEXT_X, y);
      ctx.lineTo(CARD_X + CARD_W - 48, y);
      ctx.stroke();
    }
  });
  if (extra > 0) {
    ctx.fillStyle = '#7a6a60';
    ctx.font = `800 32px ${BODY}`;
    ctx.fillText(`+ ${extra} more`, TEXT_X, y + 50);
  }

  // footer
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 46px ${DISPLAY}`;
  ctx.fillText('Made with Santa Claude', W / 2, H - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not make the picture'))), 'image/png'));
}

// ── Excel ──

let xlsxPromise = null;
/** SheetJS, loaded only when someone exports. */
export const loadXLSX = () => (xlsxPromise ??= import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs')
  .catch((e) => { xlsxPromise = null; throw e; }));

/**
 * rows: [{ person, item, claim }] for one year's shopping.
 * -> .xlsx Blob with every field, one row per item, plus a totals row.
 */
export async function shoppingWorkbook(rows, { year, shopper }) {
  const XLSX = await loadXLSX();
  const header = ['For', 'Stocking Theme', 'Item', 'Status', 'Really wants it', 'Price', 'Quantity', 'Est. total',
    'Size', 'Color', 'Notes', 'Link', 'Other links', 'Christmas'];
  const sorted = [...rows].sort((a, b) => a.person.name.localeCompare(b.person.name) || (a.item.order ?? 0) - (b.item.order ?? 0));
  const data = sorted.map(({ person, item, claim }) => [
    person.name, person.label || '', item.title, claim.status === 'bought' ? 'Bought' : 'To buy',
    item.priority ? 'Yes' : '', item.price ?? null, item.qty || 1,
    item.price != null ? Math.round(item.price * (item.qty || 1) * 100) / 100 : null,
    item.size || '', item.color || '', item.notes || '', item.link || '', (item.links || []).join('\n'), Number(year),
  ]);
  const total = data.reduce((s, r) => s + (r[7] || 0), 0);
  const aoa = [header, ...data, [], ['Total', '', '', '', '', null, null, Math.round(total * 100) / 100]];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [18, 20, 34, 9, 14, 10, 9, 11, 10, 14, 40, 40, 40, 10].map((wch) => ({ wch }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: data.length, c: header.length - 1 } }) };
  const money = '"$"#,##0.00';
  for (let r = 1; r < aoa.length; r++) {
    for (const c of [5, 7]) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = money;
    }
    const link = ws[XLSX.utils.encode_cell({ r, c: 11 })];
    if (link?.v) link.l = { Target: link.v, Tooltip: 'Open link' };
  }

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: `Christmas ${year} shopping`, Author: shopper.name };
  XLSX.utils.book_append_sheet(wb, ws, `Shopping ${year}`);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
