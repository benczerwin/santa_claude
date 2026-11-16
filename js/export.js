// Exports: a shareable picture of a wish list, and the shopping list as an Excel file.
import * as M from './model.js';

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

function wrap(ctx, text, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxW || !line) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  // a single very long word
  return lines.map((l) => {
    if (ctx.measureText(l).width <= maxW) return l;
    let s = l;
    while (s && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1);
    return `${s}…`;
  });
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
    ctx.font = `800 40px ${BODY}`;
    const title = wrap(ctx, it.title, TEXT_W, 2);
    ctx.font = `700 29px ${BODY}`;
    const meta = M.itemMeta(it);
    const link = it.link ? M.linkHost(it.link) : '';
    const metaLine = [meta, link].filter(Boolean).join(' · ');
    ctx.font = `italic 600 29px ${BODY}`;
    const notes = it.notes ? wrap(ctx, it.notes, TEXT_W, 2) : [];
    const h = 34 + title.length * 50 + (metaLine ? 40 : 0) + notes.length * 38 + 30;
    return { it, title, metaLine, notes, h };
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
  ctx.fillStyle = '#fbf0d4';
  ctx.beginPath();
  ctx.arc(W / 2, 150, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `110px ${BODY}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(person.avatar || '🎁', W / 2, 158);
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
    ctx.font = `700 32px ${BODY}`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`Stocking Theme: ${person.label}`, W / 2, 466);
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
    ctx.font = `800 40px ${BODY}`;
    for (const line of r.title) { ctx.fillText(line, TEXT_X, ty); ty += 50; }
    if (r.metaLine) {
      ctx.fillStyle = '#c42b32';
      ctx.font = `700 29px ${BODY}`;
      ctx.fillText(wrap(ctx, r.metaLine, TEXT_W, 1)[0], TEXT_X, ty - 8);
      ty += 40;
    }
    if (r.notes.length) {
      ctx.fillStyle = '#7a6a60';
      ctx.font = `italic 600 29px ${BODY}`;
      for (const line of r.notes) { ctx.fillText(line, TEXT_X, ty - 8); ty += 38; }
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
    'Size', 'Color', 'Notes', 'Link', 'Christmas'];
  const sorted = [...rows].sort((a, b) => a.person.name.localeCompare(b.person.name) || (a.item.order ?? 0) - (b.item.order ?? 0));
  const data = sorted.map(({ person, item, claim }) => [
    person.name, person.label || '', item.title, claim.status === 'bought' ? 'Bought' : 'To buy',
    item.priority ? 'Yes' : '', item.price ?? null, item.qty || 1,
    item.price != null ? Math.round(item.price * (item.qty || 1) * 100) / 100 : null,
    item.size || '', item.color || '', item.notes || '', item.link || '', Number(year),
  ]);
  const total = data.reduce((s, r) => s + (r[7] || 0), 0);
  const aoa = [header, ...data, [], ['Total', '', '', '', '', null, null, Math.round(total * 100) / 100]];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [18, 20, 34, 9, 14, 10, 9, 11, 10, 14, 40, 40, 10].map((wch) => ({ wch }));
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
