// 40 hand-drawn Christmas & Hanukkah avatar icons, one shared style:
// 64×64, cream badge, one dark outline weight, the app's palette, dot eyes + rosy cheeks on characters.
// People store an icon as 'i:<id>'; anything else in `avatar` is an emoji.

const INK = '#3b2a22';
const O = `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;
const O1 = `stroke="${INK}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
const R = '#c42b32', RD = '#9c1f25', G = '#1d6b45', GL = '#e9b64a', SK = '#f7c9a4', BR = '#c98a5a', DB = '#8b5a3c';
const W = '#ffffff', CR = '#f3dcc0', BL = '#3a6fb5', LB = '#a9c7ef', NV = '#33405a', GY = '#a7aeb8', PK = '#f29a8e';

const eyes = (x1, x2, y, r = 1.7) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${INK}"/>`;
const cheeks = (x1, x2, y, r = 2.2) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${PK}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${PK}"/>`;
const smile = (x, y, w = 3, c = INK) => `<path d="M${x - w} ${y} Q${x} ${y + 2.6} ${x + w} ${y}" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"/>`;
/** Thick line with an ink outline: draws the path twice. */
const outlined = (d, color, w = 2.4) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 2.2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const bow = (x, y, c) => `<path d="M${x} ${y} L${x - 7} ${y - 4} L${x - 7} ${y + 4} Z M${x} ${y} L${x + 7} ${y - 4} L${x + 7} ${y + 4} Z" fill="${c}" ${O}/><circle cx="${x}" cy="${y}" r="2.2" fill="${c}" ${O}/>`;
const shoulders = (c) => `<path d="M16 62 C17 53 24 50 32 50 C40 50 47 53 48 62 Z" fill="${c}" ${O}/>`;

export const ICONS = [
  // ── Christmas characters ──
  ['santa', 'Santa', `
    <path d="M17 27 C18 16 30 8 44 9 C47 12 49 20 48 27 Z" fill="${R}" ${O}/>
    <ellipse cx="32" cy="37" rx="12" ry="10" fill="${SK}" ${O}/>
    <path d="M19 36 C19 50 26 56 32 56 C38 56 45 50 45 36 C41 42 37 44 32 44 C27 44 23 42 19 36 Z" fill="${W}" ${O}/>
    <path d="M32 42 C28 39 24 41 24 44 C27 45 30 44 32 42 C34 44 37 45 40 44 C40 41 36 39 32 42 Z" fill="${W}" ${O1}/>
    <rect x="15" y="24" width="34" height="7" rx="3.5" fill="${W}" ${O}/>
    <circle cx="45" cy="10" r="4" fill="${W}" ${O}/>
    ${eyes(27.5, 36.5, 35)}${cheeks(23.8, 40.2, 38.6)}<circle cx="32" cy="39" r="2" fill="#e9877b"/>`],
  ['mrsclaus', 'Mrs. Claus', `
    ${shoulders(R)}<path d="M26 51 L32 56 L38 51" fill="none" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="32" cy="33" rx="15" ry="15" fill="${W}" ${O}/>
    <circle cx="32" cy="15" r="6" fill="${W}" ${O}/>
    <circle cx="37" cy="12" r="2" fill="${R}" ${O1}/><circle cx="39.5" cy="15" r="2" fill="${R}" ${O1}/>
    <ellipse cx="32" cy="37" rx="11" ry="11" fill="${SK}" ${O}/>
    <path d="M21 31 C24 26 29 25 32 28 C35 25 40 26 43 31 C40 28 35 28 32 30 C29 28 24 28 21 31 Z" fill="${W}" ${O1}/>
    <circle cx="27.5" cy="36" r="3.6" fill="none" ${O1}/><circle cx="36.5" cy="36" r="3.6" fill="none" ${O1}/><path d="M31.1 36 H32.9" ${O1}/>
    ${eyes(27.5, 36.5, 36, 1.3)}${cheeks(23.6, 40.4, 41)}${smile(32, 43)}`],
  ['elf', 'Elf', `
    ${shoulders(G)}<path d="M24 50 L28 55 L32 50 L36 55 L40 50" fill="none" stroke="${R}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M21 34 L10 28 L20 42 Z" fill="${SK}" ${O}/><path d="M43 34 L54 28 L44 42 Z" fill="${SK}" ${O}/>
    <ellipse cx="32" cy="38" rx="11.5" ry="11" fill="${SK}" ${O}/>
    <path d="M19 32 C20 20 28 11 46 6 C41 14 44 24 45 32 Z" fill="${G}" ${O}/>
    <rect x="18" y="28" width="28" height="6" rx="3" fill="${R}" ${O}/>
    <circle cx="46" cy="7" r="3" fill="${GL}" ${O}/>
    ${eyes(28, 36, 38.5)}${cheeks(24.5, 39.5, 42.5)}${smile(32, 44)}`],
  ['reindeer', 'Reindeer', `
    ${outlined('M24 23 C22 16 20 12 19 8 M20.5 12 C17 11 15 9 14 6 M21.6 16.5 C18 16 15 15 13 13 M40 23 C42 16 44 12 45 8 M43.5 12 C47 11 49 9 50 6 M42.4 16.5 C46 16 49 15 51 13', DB, 2.6)}
    <ellipse cx="18" cy="29" rx="6.5" ry="3.6" transform="rotate(-25 18 29)" fill="${BR}" ${O}/>
    <ellipse cx="46" cy="29" rx="6.5" ry="3.6" transform="rotate(25 46 29)" fill="${BR}" ${O}/>
    <ellipse cx="32" cy="36" rx="13" ry="15" fill="${BR}" ${O}/>
    <ellipse cx="32" cy="45" rx="9" ry="7" fill="${CR}" ${O}/>
    <circle cx="32" cy="41" r="4" fill="${R}" ${O}/><circle cx="30.6" cy="39.7" r="1.1" fill="${W}"/>
    ${smile(32, 47.5)}${eyes(27, 37, 32, 1.8)}${cheeks(23.2, 40.8, 37)}`],
  ['snowman', 'Snowman', `
    <circle cx="32" cy="50" r="14" fill="${W}" ${O}/>
    <circle cx="32" cy="28" r="10.5" fill="${W}" ${O}/>
    <path d="M21 36 Q32 41 43 36 L43 40 Q32 45 21 40 Z" fill="${R}" ${O}/><path d="M37 41 L39 51 L44 50 L42 40 Z" fill="${R}" ${O}/>
    <rect x="23" y="8" width="18" height="11" rx="1.5" fill="${NV}" ${O}/><rect x="23" y="14.5" width="18" height="3.5" fill="${G}" ${O1}/>
    <rect x="18.5" y="18" width="27" height="4" rx="2" fill="${NV}" ${O}/>
    <path d="M32 28.5 L40 30 L32 31.5 Z" fill="#f08a24" ${O1}/>
    ${eyes(28.5, 35.5, 26)}${cheeks(25.8, 38.2, 31, 1.9)}
    <circle cx="32" cy="48" r="1.6" fill="${INK}"/><circle cx="32" cy="54" r="1.6" fill="${INK}"/>`],
  ['gingerbread', 'Gingerbread', `
    <g fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round">
      <circle cx="32" cy="18" r="9"/><rect x="13" y="27" width="38" height="9" rx="4.5"/><rect x="23" y="25" width="18" height="21" rx="6"/>
      <rect x="22" y="40" width="8" height="16" rx="4" transform="rotate(12 26 44)"/><rect x="34" y="40" width="8" height="16" rx="4" transform="rotate(-12 38 44)"/>
    </g>
    <g fill="${BR}">
      <circle cx="32" cy="18" r="9"/><rect x="13" y="27" width="38" height="9" rx="4.5"/><rect x="23" y="25" width="18" height="21" rx="6"/>
      <rect x="22" y="40" width="8" height="16" rx="4" transform="rotate(12 26 44)"/><rect x="34" y="40" width="8" height="16" rx="4" transform="rotate(-12 38 44)"/>
    </g>
    <path d="M17 28.5 l1.6 2 l-1.6 2 l1.6 2 M47 28.5 l-1.6 2 l1.6 2 l-1.6 2" fill="none" stroke="${W}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="32" cy="31" r="2" fill="${R}"/><circle cx="32" cy="37.5" r="2" fill="${G}"/>
    ${eyes(28.6, 35.4, 17, 1.6)}${smile(32, 20.6, 3.2, W)}${cheeks(26, 38, 20.4, 1.8)}`],
  ['nutcracker', 'Nutcracker', `
    ${shoulders(R)}<circle cx="19.5" cy="54" r="3.2" fill="${GL}" ${O1}/><circle cx="44.5" cy="54" r="3.2" fill="${GL}" ${O1}/>
    <rect x="22" y="23" width="20" height="26" rx="4" fill="${SK}" ${O}/>
    <path d="M22 37 H42 V42 C42 48 37 50 32 50 C27 50 22 48 22 42 Z" fill="${W}" ${O}/>
    <path d="M32 38 C29 36 25 37 25 39.5 C28 40.5 30 40 32 38 C34 40 36 40.5 39 39.5 C39 37 35 36 32 38 Z" fill="${W}" ${O1}/>
    <path d="M29.5 43.5 H34.5" ${O}/>
    <rect x="21" y="8" width="22" height="17" rx="3" fill="${NV}" ${O}/><rect x="21" y="20" width="22" height="4" fill="${GL}" ${O1}/>
    <circle cx="32" cy="8.5" r="2.8" fill="${GL}" ${O1}/>
    ${eyes(28, 36, 30)}${cheeks(25, 39, 34, 2)}`],
  ['angel', 'Angel', `
    <path d="M23 40 C11 32 7 46 13 52 C17 51 22 47 25 44 Z" fill="${W}" ${O}/><path d="M41 40 C53 32 57 46 51 52 C47 51 42 47 39 44 Z" fill="${W}" ${O}/>
    <path d="M21 60 L26 39 H38 L43 60 Z" fill="${LB}" ${O}/><path d="M22 56 H42" stroke="${GL}" stroke-width="2"/>
    <circle cx="32" cy="30" r="9.5" fill="${SK}" ${O}/>
    <path d="M22.5 31 C21 19 43 19 41.5 31 C39 25 34 24 32 26 C30 24 25 25 22.5 31 Z" fill="${GL}" ${O}/>
    ${outlined('M24 13 C24 10 40 10 40 13 C40 16 24 16 24 13 Z', GL, 2)}
    ${eyes(28.5, 35.5, 31, 1.5)}${cheeks(26, 38, 34.5, 1.9)}${smile(32, 35.4, 2.4)}`],

  // ── winter animals ──
  ['penguin', 'Penguin', `
    <ellipse cx="32" cy="38" rx="16" ry="17" fill="${NV}" ${O}/>
    <ellipse cx="32" cy="48" rx="9" ry="6.5" fill="${W}"/>
    <path d="M32 26 C26 22 19 26 20 33 C21 40 26 43 32 43 C38 43 43 40 44 33 C45 26 38 22 32 26 Z" fill="${W}" ${O1}/>
    <path d="M38 46 L41 55 L46 53 L43 45 Z" fill="${R}" ${O}/>
    <path d="M18 41 C26 45 38 45 46 41 L46 45.5 C38 49.5 26 49.5 18 45.5 Z" fill="${R}" ${O}/>
    <path d="M29.5 34.5 L34.5 34.5 L32 38 Z" fill="${GL}" ${O1}/>
    ${eyes(27.5, 36.5, 31)}${cheeks(24.6, 39.4, 35.2)}
    <path d="M19 25 C19 13 45 13 45 25 Z" fill="${G}" ${O}/>
    <rect x="17" y="22.5" width="30" height="6" rx="3" fill="${W}" ${O}/>
    <circle cx="32" cy="12" r="4" fill="${GL}" ${O}/>`],
  ['polarbear', 'Polar bear', `
    <circle cx="20" cy="21" r="5.5" fill="${W}" ${O}/><circle cx="20" cy="21" r="2.4" fill="${PK}"/>
    <circle cx="44" cy="21" r="5.5" fill="${W}" ${O}/><circle cx="44" cy="21" r="2.4" fill="${PK}"/>
    <path d="M17 48 Q32 56 47 48 L47 53 Q32 61 17 53 Z" fill="${R}" ${O}/>
    <ellipse cx="32" cy="35" rx="16" ry="14.5" fill="${W}" ${O}/>
    <ellipse cx="32" cy="41" rx="7.5" ry="5.8" fill="#f1ebe2" ${O1}/>
    <ellipse cx="32" cy="38.6" rx="2.7" ry="2" fill="${INK}"/>${smile(32, 42, 2.4)}
    ${eyes(26, 38, 31.5)}${cheeks(22, 42, 37)}`],
  ['owl', 'Owl', `
    <path d="M19 24 L17 11 L27 19 Z" fill="${DB}" ${O}/><path d="M45 24 L47 11 L37 19 Z" fill="${DB}" ${O}/>
    <ellipse cx="32" cy="36" rx="15.5" ry="18.5" fill="${DB}" ${O}/>
    <ellipse cx="32" cy="43" rx="9" ry="10" fill="${CR}" ${O1}/>
    <path d="M27 40 q2.5 2 5 0 q2.5 2 5 0 M27 45 q2.5 2 5 0 q2.5 2 5 0" fill="none" stroke="${BR}" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="25.5" cy="29" r="6" fill="${W}" ${O}/><circle cx="38.5" cy="29" r="6" fill="${W}" ${O}/>
    <circle cx="26" cy="29.5" r="2.6" fill="${INK}"/><circle cx="38" cy="29.5" r="2.6" fill="${INK}"/>
    <circle cx="26.9" cy="28.5" r="0.8" fill="${W}"/><circle cx="38.9" cy="28.5" r="0.8" fill="${W}"/>
    <path d="M29.8 34 L34.2 34 L32 38 Z" fill="${GL}" ${O1}/>
    <path d="M26 54 v3 M29 54 v3 M35 54 v3 M38 54 v3" stroke="${GL}" stroke-width="2.4" stroke-linecap="round"/>`],
  ['fox', 'Fox', `
    <path d="M18 27 L16 10 L29 19 Z" fill="#e07a33" ${O}/><path d="M46 27 L48 10 L35 19 Z" fill="#e07a33" ${O}/>
    <path d="M19.5 22 L19 14 L25.5 19 Z M44.5 22 L45 14 L38.5 19 Z" fill="${DB}"/>
    <path d="M13 31 C15 22 23 18 32 18 C41 18 49 22 51 31 C49 41 41 50 32 52 C23 50 15 41 13 31 Z" fill="#e07a33" ${O}/>
    <path d="M13.5 31.5 C20 34 27 38 32 45 C37 38 44 34 50.5 31.5 C48.5 41 41 50 32 52 C23 50 15.5 41 13.5 31.5 Z" fill="${W}" ${O1}/>
    <ellipse cx="32" cy="46.5" rx="2.6" ry="1.9" fill="${INK}"/>
    ${eyes(25.5, 38.5, 32)}${cheeks(22.5, 41.5, 38)}`],
  ['bunny', 'Bunny', `
    <ellipse cx="25" cy="16" rx="4.8" ry="11.5" transform="rotate(-8 25 16)" fill="${W}" ${O}/>
    <ellipse cx="39" cy="16" rx="4.8" ry="11.5" transform="rotate(8 39 16)" fill="${W}" ${O}/>
    <ellipse cx="25" cy="17" rx="2" ry="7.5" transform="rotate(-8 25 17)" fill="${PK}"/><ellipse cx="39" cy="17" rx="2" ry="7.5" transform="rotate(8 39 17)" fill="${PK}"/>
    <ellipse cx="32" cy="38" rx="14" ry="13" fill="${W}" ${O}/>
    ${eyes(27, 37, 36)}<ellipse cx="32" cy="40.2" rx="1.8" ry="1.4" fill="#e9877b"/>
    <path d="M29.6 42.4 Q31 44.2 32 42.6 Q33 44.2 34.4 42.4" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
    ${cheeks(23, 41, 41)}${bow(32, 53, R)}`],
  ['mouse', 'Mouse', `
    <circle cx="19" cy="24" r="8.5" fill="${GY}" ${O}/><circle cx="19" cy="24" r="4.6" fill="${PK}"/>
    <circle cx="45" cy="24" r="8.5" fill="${GY}" ${O}/><circle cx="45" cy="24" r="4.6" fill="${PK}"/>
    <path d="M18 47 Q32 54 46 47 L46 51.5 Q32 58.5 18 51.5 Z" fill="${G}" ${O}/><path d="M23 52 L21 60 L26 60 L27 53 Z" fill="${G}" ${O}/>
    <ellipse cx="32" cy="37" rx="13.5" ry="12.5" fill="${GY}" ${O}/>
    ${eyes(27, 37, 35)}<circle cx="32" cy="40" r="2" fill="#e9877b"/>
    <path d="M27 41 L19 39.5 M27 43 L19 44 M37 41 L45 39.5 M37 43 L45 44" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>
    ${cheeks(23.5, 40.5, 39.5, 1.9)}`],
  ['cat', 'Cat', `
    <path d="M18 30 L18 15 L28 23 Z" fill="#e8a14f" ${O}/><path d="M46 30 L46 15 L36 23 Z" fill="#e8a14f" ${O}/>
    <ellipse cx="32" cy="38" rx="15.5" ry="13.5" fill="#e8a14f" ${O}/>
    <path d="M26 27 q2 3 0 5 M38 27 q-2 3 0 5" fill="none" stroke="#c97d2e" stroke-width="1.8" stroke-linecap="round"/>
    <ellipse cx="32" cy="43" rx="6.5" ry="4.5" fill="${W}" ${O1}/>
    <path d="M30.6 40.2 H33.4 L32 41.8 Z" fill="#e9877b"/>
    <path d="M26 43 L18 41.5 M26 45 L18 46 M38 43 L46 41.5 M38 45 L46 46" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>
    ${eyes(26.5, 37.5, 36)}${cheeks(22.5, 41.5, 40.5, 1.9)}
    <path d="M19 27 C20 15 32 8 46 12 C44 16 44 20 44 25 Z" fill="${R}" ${O}/>
    <path d="M17 28 C25 23 37 22 46 24.5 L46 29 C37 26.5 25 27.5 17 32.5 Z" fill="${W}" ${O}/>
    <circle cx="46" cy="12" r="3.4" fill="${W}" ${O}/>`],
  ['puppy', 'Puppy', `
    <ellipse cx="18.5" cy="35" rx="5.8" ry="10.5" transform="rotate(14 18.5 35)" fill="${DB}" ${O}/>
    <ellipse cx="45.5" cy="35" rx="5.8" ry="10.5" transform="rotate(-14 45.5 35)" fill="${DB}" ${O}/>
    <path d="M20 47 Q32 53 44 47 L44 51 Q32 57 20 51 Z" fill="${G}" ${O}/><circle cx="32" cy="55.5" r="2.6" fill="${GL}" ${O1}/>
    <ellipse cx="32" cy="35" rx="13" ry="13.5" fill="#d9a46b" ${O}/>
    <ellipse cx="32" cy="41" rx="7.2" ry="5.6" fill="${CR}" ${O1}/>
    <ellipse cx="32" cy="38.6" rx="2.7" ry="2" fill="${INK}"/>${smile(32, 42.2, 2.3)}
    ${eyes(27, 37, 32)}${cheeks(23.4, 40.6, 37, 2)}${bow(32, 21.5, R)}`],
  ['cardinal', 'Cardinal', `
    ${outlined('M8 55 H54', DB, 2.8)}
    <path d="M14 46 C12 36 20 26 30 23 L33 11 L40 21 C47 24 50 32 48 41 C46 50 37 55 28 55 C21 55 15 52 14 46 Z" fill="${R}" ${O}/>
    <path d="M18 43 C22 36 32 37 35 45 C29 50 22 50 18 43 Z" fill="${RD}" ${O1}/>
    <path d="M36 27 C40 24 46 26 47.5 31.5 C44 34 40 34 36 32 Z" fill="${NV}"/>
    <path d="M46 27.5 L53 30.5 L46 33.5 Z" fill="#f2a93b" ${O1}/>
    <circle cx="41" cy="29" r="1.7" fill="${W}"/><circle cx="41.3" cy="29.2" r="0.9" fill="${INK}"/>
    <circle cx="40" cy="36.5" r="1.9" fill="${PK}"/>`],
  ['moose', 'Moose', `
    <path d="M23 22 C15 22 9 16 9 9 C12 12 14 11 15 7.5 C16.5 11 18.5 11 20 7.5 C21 12 23.5 15 27 18 Z" fill="#e3c9a0" ${O}/>
    <path d="M41 22 C49 22 55 16 55 9 C52 12 50 11 49 7.5 C47.5 11 45.5 11 44 7.5 C43 12 40.5 15 37 18 Z" fill="#e3c9a0" ${O}/>
    <ellipse cx="18.5" cy="27" rx="5.5" ry="3.2" transform="rotate(-20 18.5 27)" fill="#7a4e2d" ${O}/>
    <ellipse cx="45.5" cy="27" rx="5.5" ry="3.2" transform="rotate(20 45.5 27)" fill="#7a4e2d" ${O}/>
    <path d="M22 26 C22 18 42 18 42 26 L44 43 C44 54 20 54 20 43 Z" fill="#7a4e2d" ${O}/>
    <ellipse cx="32" cy="46" rx="10.5" ry="7.5" fill="${BR}" ${O}/>
    <ellipse cx="28.5" cy="46" rx="1.3" ry="1.8" fill="${INK}"/><ellipse cx="35.5" cy="46" rx="1.3" ry="1.8" fill="${INK}"/>
    ${eyes(27, 37, 31)}${cheeks(24.5, 39.5, 36, 2)}`],

  // ── Christmas things ──
  ['tree', 'Tree', `
    <rect x="28" y="51" width="8" height="8" rx="1" fill="${DB}" ${O}/>
    <path d="M32 9 L45 25 H39.5 L49 38 H42.5 L52 53 H12 L21.5 38 H15 L24.5 25 H19 Z" fill="${G}" ${O}/>
    <circle cx="26" cy="33" r="2.3" fill="${R}" ${O1}/><circle cx="38" cy="30" r="2.3" fill="${GL}" ${O1}/>
    <circle cx="36" cy="45" r="2.3" fill="${R}" ${O1}/><circle cx="23.5" cy="47" r="2.3" fill="${GL}" ${O1}/><circle cx="31" cy="40" r="2.3" fill="${LB}" ${O1}/>
    <path d="M32 3.5 L33.8 7.2 L37.8 7.6 L34.8 10.3 L35.7 14.3 L32 12.2 L28.3 14.3 L29.2 10.3 L26.2 7.6 L30.2 7.2 Z" fill="${GL}" ${O1}/>`],
  ['star', 'Star', `
    <path d="M32 10 L37.9 24.4 L53.4 25.6 L41.6 35.7 L45.3 50.8 L32 42.7 L18.7 50.8 L22.4 35.7 L10.6 25.6 L26.1 24.4 Z" fill="${GL}" ${O}/>
    <path d="M32 18 L35 26.5 L42.5 27.5" fill="none" stroke="#f6d488" stroke-width="2" stroke-linecap="round"/>
    <path d="M51 12 v5 M48.5 14.5 h5 M13 45 v4 M11 47 h4" stroke="${GL}" stroke-width="1.8" stroke-linecap="round"/>`],
  ['ornament', 'Ornament', `
    <circle cx="32" cy="12" r="3.2" fill="none" ${O}/>
    <circle cx="32" cy="37" r="16.5" fill="${R}" ${O}/>
    <path d="M16.4 32 Q24 28 32 32 T47.6 32" fill="none" stroke="${W}" stroke-width="2.6"/>
    <path d="M16.2 41 Q24 45 32 41 T47.8 41" fill="none" stroke="${GL}" stroke-width="2.6"/>
    <circle cx="24" cy="36.5" r="1.4" fill="${W}"/><circle cx="32" cy="36.5" r="1.4" fill="${W}"/><circle cx="40" cy="36.5" r="1.4" fill="${W}"/>
    <rect x="27" y="15.5" width="10" height="6.5" rx="1.5" fill="${GL}" ${O}/>
    <ellipse cx="24.5" cy="27.5" rx="2.2" ry="3.6" transform="rotate(35 24.5 27.5)" fill="${W}" opacity="0.55"/>`],
  ['stocking', 'Stocking', `
    <path d="M23 15 H39 V36 L46.5 42 C51 46 48.5 55 41 55 L28 53 C21.5 52 19.5 45.5 23 40 Z" fill="${R}" ${O}/>
    <path d="M38 45 C42 42.5 49 44 48 50.5 C47 54.5 42.5 55 39.5 54 C37 51.5 37 47.5 38 45 Z" fill="${G}" ${O1}/>
    <path d="M23 40 C21.5 45.5 23 50.5 28 53 L30.5 46.5 C27.5 45.5 25 43 23 40 Z" fill="${G}" ${O1}/>
    <path d="M31 25.5 L32.3 28.2 L35.2 28.5 L33 30.4 L33.6 33.3 L31 31.8 L28.4 33.3 L29 30.4 L26.8 28.5 L29.7 28.2 Z" fill="${GL}"/>
    <rect x="20.5" y="8.5" width="21" height="9" rx="3" fill="${W}" ${O}/>`],
  ['mitten', 'Mitten', `
    <path d="M22 50 V30 C22 20 27.5 14 33.5 14 C39.5 14 44 20 44 28 V33 C48 29.5 52.5 31.5 51.5 37 C50.5 42 46.5 44 44 46 V50 Z" fill="${R}" ${O}/>
    <path d="M29 26 L37 34 M37 26 L29 34 M33 24.5 V35.5 M27.5 30 H38.5" stroke="${W}" stroke-width="1.7" stroke-linecap="round"/>
    <rect x="19.5" y="47" width="27" height="10" rx="3" fill="${W}" ${O}/>
    <path d="M24 52 h2 M29 52 h2 M34 52 h2 M39 52 h2" stroke="${LB}" stroke-width="2" stroke-linecap="round"/>`],
  ['candycane', 'Candy cane', `
    <path d="M27 55 V24 C27 11 45 11 45 24 V28" fill="none" stroke="${INK}" stroke-width="10.2" stroke-linecap="round"/>
    <path d="M27 55 V24 C27 11 45 11 45 24 V28" fill="none" stroke="${W}" stroke-width="7" stroke-linecap="round"/>
    <path d="M27 55 V24 C27 11 45 11 45 24 V28" fill="none" stroke="${R}" stroke-width="7" stroke-dasharray="4.5 4.5"/>
    ${bow(27, 40, G)}`],
  ['present', 'Present', `
    <rect x="14" y="29" width="36" height="26" rx="3" fill="${R}" ${O}/>
    <rect x="12" y="23" width="40" height="8" rx="2.5" fill="${R}" ${O}/>
    <rect x="29" y="23" width="6" height="32" fill="${GL}" ${O1}/>
    <ellipse cx="25.5" cy="17.5" rx="6.5" ry="4.2" transform="rotate(-20 25.5 17.5)" fill="${GL}" ${O}/>
    <ellipse cx="38.5" cy="17.5" rx="6.5" ry="4.2" transform="rotate(20 38.5 17.5)" fill="${GL}" ${O}/>
    <circle cx="32" cy="21" r="3" fill="${GL}" ${O}/>`],
  ['bell', 'Bell', `
    <path d="M24 14 C20 9 14 11 15 15 C19 17 22 16 24 14 Z M40 14 C44 9 50 11 49 15 C45 17 42 16 40 14 Z" fill="${G}" ${O1}/>
    <circle cx="32" cy="54" r="3.6" fill="#d39a2a" ${O}/>
    <path d="M18 46 C20.5 41 20 35 20 30 C20 21.5 25.5 16 32 16 C38.5 16 44 21.5 44 30 C44 35 43.5 41 46 46 Z" fill="${GL}" ${O}/>
    <rect x="15.5" y="45" width="33" height="6" rx="3" fill="${GL}" ${O}/>
    <path d="M25 24 C23.5 27 23.5 32 24 36" fill="none" stroke="#f6d488" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="29" cy="14.5" r="2.6" fill="${R}" ${O1}/><circle cx="35" cy="14.5" r="2.6" fill="${R}" ${O1}/>`],
  ['wreath', 'Wreath', `
    <circle cx="32" cy="31" r="16.5" fill="none" stroke="${INK}" stroke-width="12.5"/>
    <circle cx="32" cy="31" r="16.5" fill="none" stroke="${G}" stroke-width="9.5"/>
    <circle cx="32" cy="31" r="16.5" fill="none" stroke="#2f8a5c" stroke-width="3" stroke-dasharray="3 5"/>
    <circle cx="20" cy="22" r="2.2" fill="${R}" ${O1}/><circle cx="44" cy="22" r="2.2" fill="${R}" ${O1}/><circle cx="32" cy="14.5" r="2.2" fill="${R}" ${O1}/>
    <circle cx="16" cy="35" r="2.2" fill="${R}" ${O1}/><circle cx="48" cy="35" r="2.2" fill="${R}" ${O1}/>
    <path d="M29 49 L25 58 L29 57 L31 52 Z M35 49 L39 58 L35 57 L33 52 Z" fill="${R}" ${O1}/>${bow(32, 47, R)}`],
  ['cocoa', 'Hot cocoa', `
    <path d="M24 17 C22 14 26 12 24 8.5 M32 17 C30 14 34 12 32 8.5 M40 17 C38 14 42 12 40 8.5" fill="none" stroke="#c9b8a8" stroke-width="2" stroke-linecap="round"/>
    ${outlined('M44 30 C53 30 53 45 44 45', R, 3.2)}
    <path d="M15 24 H45 V48 C45 53 41 56 36 56 H24 C19 56 15 53 15 48 Z" fill="${R}" ${O}/>
    <ellipse cx="30" cy="24" rx="15" ry="4" fill="${DB}" ${O}/>
    <rect x="22" y="19.5" width="5.5" height="5.5" rx="1.4" fill="${W}" ${O1} transform="rotate(-12 24.75 22.25)"/>
    <rect x="31" y="18.5" width="5.5" height="5.5" rx="1.4" fill="${W}" ${O1} transform="rotate(10 33.75 21.25)"/>
    <path d="M30 36 C27 32.5 22.5 35.5 26 39.5 L30 43 L34 39.5 C37.5 35.5 33 32.5 30 36 Z" fill="${W}"/>`],
  ['cookie', 'Cookie', `
    <circle cx="32" cy="33" r="19" fill="#d9a46b" ${O}/>
    <circle cx="32" cy="33" r="15.5" fill="none" stroke="#c48a4f" stroke-width="1.2" stroke-dasharray="2 3"/>
    <g fill="#5a3a24"><circle cx="24" cy="26" r="2.4"/><circle cx="38" cy="23.5" r="2.4"/><circle cx="31" cy="34" r="2.4"/><circle cx="42" cy="37" r="2.4"/><circle cx="23.5" cy="41" r="2.4"/><circle cx="34" cy="45" r="2.4"/></g>
    <circle cx="22.8" cy="25" r="0.8" fill="#8d6748"/><circle cx="36.8" cy="22.5" r="0.8" fill="#8d6748"/>`],
  ['sled', 'Sled', `
    <rect x="23" y="17" width="14" height="12" rx="1.5" fill="${G}" ${O}/><rect x="28" y="17" width="4" height="12" fill="${GL}"/>
    <path d="M23 17 h14" ${O}/>${bow(30, 15.5, GL)}
    <rect x="18" y="38" width="3.5" height="9" fill="${DB}" ${O1}/><rect x="40" y="38" width="3.5" height="9" fill="${DB}" ${O1}/>
    <rect x="14" y="29" width="34" height="9" rx="2" fill="${R}" ${O}/>
    ${outlined('M10 47 H47 C54 47 55 40 50.5 37.5', GL, 2.6)}`],
  ['snowglobe', 'Snow globe', `
    <circle cx="32" cy="29" r="16.5" fill="#d8e8f7" ${O}/>
    <path d="M16.2 34.5 Q32 30 47.8 34.5 A16.5 16.5 0 0 1 16.2 34.5 Z" fill="${W}"/>
    <path d="M32 18 L39 31 H25 Z" fill="${G}" ${O1}/><rect x="30.5" y="31" width="3" height="3" fill="${DB}"/>
    <g fill="${W}"><circle cx="22" cy="22" r="1.3"/><circle cx="41" cy="20" r="1.3"/><circle cx="43" cy="28" r="1.1"/><circle cx="21" cy="30" r="1.1"/><circle cx="33" cy="14" r="1.1"/></g>
    <ellipse cx="24" cy="21" rx="2.4" ry="4" transform="rotate(35 24 21)" fill="${W}" opacity="0.6"/>
    <circle cx="32" cy="29" r="16.5" fill="none" ${O}/>
    <path d="M17 55 L21 44 H43 L47 55 Z" fill="${R}" ${O}/><path d="M22.5 49.5 H41.5" stroke="${GL}" stroke-width="2"/>`],
  ['holly', 'Holly', `
    <path d="M32 34 C26 27 16 27 9 31 C11.5 33 11.5 36 10 38 C17 40 26 40 32 34 Z" fill="${G}" ${O}/>
    <path d="M32 34 C38 27 48 27 55 31 C52.5 33 52.5 36 54 38 C47 40 38 40 32 34 Z" fill="${G}" ${O}/>
    <path d="M32 34 C27 40 27 49 31 57 C33 55 35.5 55 37.5 56 C38 48 37 40 32 34 Z" fill="${G}" ${O}/>
    <path d="M13 34 L29 34.5 M51 34 L35 34.5 M33 38 L34 53" stroke="#2f8a5c" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="27" cy="27" r="4.4" fill="${R}" ${O}/><circle cx="37" cy="27" r="4.4" fill="${R}" ${O}/><circle cx="32" cy="20" r="4.4" fill="${R}" ${O}/>
    <circle cx="25.6" cy="25.6" r="1.1" fill="${W}"/><circle cx="35.6" cy="25.6" r="1.1" fill="${W}"/><circle cx="30.6" cy="18.6" r="1.1" fill="${W}"/>`],

  // ── Hanukkah ──
  ['menorah', 'Menorah', `
    ${outlined('M11.2 30 Q11.2 44 32 44 Q52.8 44 52.8 30 M16.4 30 Q16.4 41 32 41 Q47.6 41 47.6 30 M21.6 30 Q21.6 38.5 32 38.5 Q42.4 38.5 42.4 30 M26.8 30 Q26.8 36 32 36 Q37.2 36 37.2 30', GL, 2.2)}
    <rect x="30" y="29" width="4" height="22" rx="1" fill="${GL}" ${O1}/>
    <path d="M24 55 L40 55 L37 50 L27 50 Z" fill="${GL}" ${O}/>
    <g fill="${BL}" stroke="${INK}" stroke-width="1.2">
      ${[11.2, 16.4, 21.6, 26.8, 37.2, 42.4, 47.6, 52.8].map((x) => `<rect x="${x - 1.7}" y="23" width="3.4" height="7" rx="0.8"/>`).join('')}
      <rect x="30.3" y="18" width="3.4" height="11" rx="0.8"/>
    </g>
    <g fill="#f2a93b">
      ${[11.2, 16.4, 21.6, 26.8, 37.2, 42.4, 47.6, 52.8].map((x) => `<path d="M${x} 22 c-2 -1.6 -1.3 -4.2 0 -5.6 c1.3 1.4 2 4 0 5.6 Z"/>`).join('')}
      <path d="M32 17 c-2 -1.6 -1.3 -4.2 0 -5.6 c1.3 1.4 2 4 0 5.6 Z"/>
    </g>`],
  ['dreidel', 'Dreidel', `
    <rect x="29" y="7" width="6" height="11" rx="2.5" fill="#cfd8e3" ${O}/>
    <path d="M17 21 L26 16 L47 16 L39 21 Z" fill="${LB}" ${O}/>
    <path d="M39 21 L47 16 L47 32 L28 54 L39 37 Z" fill="#2c5590" ${O}/>
    <path d="M17 21 L39 21 L39 37 L28 54 L17 37 Z" fill="${BL}" ${O}/>
    <path d="M24 27 H30 V38 H24" fill="none" stroke="${GL}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="44" cy="10" r="1.4" fill="${GL}"/><circle cx="52" cy="20" r="1" fill="${GL}"/>`],
  ['starofdavid', 'Star of David', `
    ${outlined('M32 11 L50.5 43 H13.5 Z M32 53 L13.5 21 H50.5 Z', BL, 3.6)}
    <path d="M51 10 v5 M48.5 12.5 h5 M13 48 v4 M11 50 h4" stroke="${GL}" stroke-width="1.8" stroke-linecap="round"/>`],
  ['sufganiyah', 'Sufganiyah', `
    <ellipse cx="32" cy="39" rx="19.5" ry="14" fill="#e2a861" ${O}/>
    <path d="M13.5 36 C15 27 23 22.5 32 22.5 C41 22.5 49 27 50.5 36 C47 34 45 38 41 36 C37 34 35 38 31 36 C27 34 25 38 21 36 C18 34.5 16 37.5 13.5 36 Z" fill="${W}" ${O1}/>
    <path d="M28.5 24 C28.5 20.5 35.5 20.5 35.5 24 C35.5 27 33.5 27 33 30 C32.5 27 28.5 27 28.5 24 Z" fill="${R}" ${O1}/>
    <g fill="${W}"><circle cx="22" cy="44" r="0.9"/><circle cx="28" cy="47" r="0.9"/><circle cx="37" cy="46" r="0.9"/><circle cx="43" cy="43" r="0.9"/></g>`],
  ['latke', 'Latke', `
    <ellipse cx="32" cy="45" rx="20" ry="8" fill="#b9782f" ${O}/>
    <ellipse cx="32" cy="37" rx="19" ry="8.5" fill="#e0a64e" ${O}/>
    <path d="M19 37 l3 -1 M23 41 l3 0.6 M40 40 l3 -0.8 M44 35 l2.6 1 M26 33 l2 -1.2" stroke="#b9782f" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M23.5 33 C23 26.5 41 26.5 40.5 33 C40 36.5 24 36.5 23.5 33 Z" fill="${W}" ${O1}/>
    <path d="M30 28 q2 -3 4 0" fill="none" stroke="${W}" stroke-width="2" stroke-linecap="round"/>
    <path d="M28 31 l2 -1 M34 30.5 l2 1 M31 33 l1.6 -0.8" stroke="${G}" stroke-width="1.5" stroke-linecap="round"/>`],
  ['gelt', 'Gelt', `
    <circle cx="40" cy="27" r="13" fill="${GL}" ${O}/><circle cx="40" cy="27" r="9.5" fill="none" stroke="#c99528" stroke-width="1.4"/>
    <circle cx="26" cy="40" r="13.5" fill="${GL}" ${O}/><circle cx="26" cy="40" r="10" fill="none" stroke="#c99528" stroke-width="1.4"/>
    <path d="M26 33.5 L31.2 42.5 H20.8 Z M26 46.5 L20.8 37.5 H31.2 Z" fill="none" stroke="#a77a1d" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M18 34 C19.5 31.5 21.5 30.5 23.5 30" fill="none" stroke="#f6d488" stroke-width="2" stroke-linecap="round"/>`],
  ['oiljug', 'Oil jug', `
    <path d="M32 6 C29 10.5 29 13.5 32 13.5 C35 13.5 35 10.5 32 6 Z" fill="${GL}" ${O1}/>
    ${outlined('M41.5 31 C50.5 29 52.5 40 46 44', '#d17a4a', 3)}
    <path d="M23 55 C14 51 14 35 24.5 31 L26 22 H38 L39.5 31 C50 35 50 51 41 55 Z" fill="#d17a4a" ${O}/>
    <rect x="23.5" y="17.5" width="17" height="5.5" rx="2" fill="#d17a4a" ${O}/>
    <path d="M18.5 42 Q32 46.5 45.5 42" fill="none" stroke="${GL}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M20 47.5 Q32 51.5 44 47.5" fill="none" stroke="${BL}" stroke-width="2" stroke-linecap="round"/>`],
  ['bluegift', 'Blue gift', `
    <rect x="14" y="29" width="36" height="26" rx="3" fill="${BL}" ${O}/>
    <rect x="12" y="23" width="40" height="8" rx="2.5" fill="${BL}" ${O}/>
    <rect x="29" y="23" width="6" height="32" fill="#dfe6ee" ${O1}/>
    <ellipse cx="25.5" cy="17.5" rx="6.5" ry="4.2" transform="rotate(-20 25.5 17.5)" fill="#dfe6ee" ${O}/>
    <ellipse cx="38.5" cy="17.5" rx="6.5" ry="4.2" transform="rotate(20 38.5 17.5)" fill="#dfe6ee" ${O}/>
    <circle cx="32" cy="21" r="3" fill="#dfe6ee" ${O}/>
    <path d="M21.5 38 L23 41.2 L26.5 41.5 L23.9 43.8 L24.6 47.2 L21.5 45.4 L18.4 47.2 L19.1 43.8 L16.5 41.5 L20 41.2 Z" fill="${GL}"/>`],
];

const BY_ID = Object.fromEntries(ICONS.map(([id, name, body]) => [id, { name, body }]));

/** Avatar ids people can pick, in picker order. */
export const ICON_IDS = ICONS.map(([id]) => `i:${id}`);

export const isIcon = (avatar) => typeof avatar === 'string' && avatar.startsWith('i:') && !!BY_ID[avatar.slice(2)];
export const iconName = (avatar) => BY_ID[avatar?.slice(2)]?.name || '';

/** Full SVG markup (with cream badge) for an icon avatar. */
export function avatarSVG(avatar) {
  const icon = BY_ID[avatar.slice(2)];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><circle cx="32" cy="32" r="32" fill="#fbf0d4"/>${icon ? icon.body : ''}</svg>`;
}
