// A made-up family to try the app with. Replaces everything in the database.
import * as store from './store.js';
import { defaultLockDate } from './model.js';

const THIS_YEAR = defaultLockDate().slice(0, 4);
const LAST_YEAR = String(Number(THIS_YEAR) - 1);

const COLS = ['claims', 'photos', 'items', 'people', 'settings'];

function getAll(col) {
  return new Promise((resolve) => {
    let un = null;
    un = store.watchAll(col, (rows) => { resolve(rows); setTimeout(() => un && un()); });
  });
}

const amazon = (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;

const PEOPLE = {
  alex: { name: 'Alex', avatar: 'i:santa', label: 'Coffee & cozy', managedBy: null },
  jordan: { name: 'Jordan', avatar: 'i:fox', label: 'Board games', managedBy: null },
  sam: { name: 'Sam', avatar: 'i:penguin', label: 'Hot sauce', managedBy: null },
  rose: { name: 'Grandma Rose', avatar: 'i:cardinal', label: 'Gardening', managedBy: null },
  milo: { name: 'Milo', avatar: 'i:gingerbread', label: 'Dinosaurs', managedBy: 'jordan' },
  ivy: { name: 'Ivy', avatar: 'i:bunny', label: 'Art supplies', managedBy: 'alex' },
};

// [owner, title, {fields}]
const ITEMS = [
  ['alex', 'Gooseneck pour-over kettle', { priority: true, price: 45, color: 'Matte black', link: amazon('gooseneck pour over kettle'), notes: 'Electric with temperature control if possible.' }],
  ['alex', 'Wool hiking socks', { price: 22, qty: 3, size: 'L', notes: 'Darn Tough or Smartwool.' }],
  ['alex', 'A new mystery novel', { price: 28, notes: "Anything by Tana French I haven't read. I already have In the Woods." }],
  ['alex', 'Cast iron skillet', { price: 35, size: '12 inch', link: 'https://www.lodgecastiron.com' }],
  ['alex', 'Noise-cancelling headphones', { price: 349.99, link: amazon('noise cancelling headphones') }],
  ['jordan', 'Catan: Seafarers expansion', { priority: true, price: 50, link: 'https://www.catan.com' }],
  ['jordan', 'Bluetooth speaker', { price: 80, color: 'Blue', notes: 'Waterproof, for the shower.' }],
  ['jordan', '1000-piece puzzle', { price: 20, notes: 'Landscapes, not cartoons.' }],
  ['jordan', 'Running gloves', { price: 25, size: 'M', color: 'Black' }],
  ['sam', 'Hot sauce sampler', { priority: true, price: 40, link: amazon('hot sauce sampler gift set'), notes: 'The hotter the better.' }],
  ['sam', 'Cookbook', { price: 30, notes: 'Something Thai or Korean.' }],
  ['sam', 'Fleece hoodie', { price: 60, size: 'XL', color: 'Forest green' }],
  ['rose', 'Folding garden kneeler', { priority: true, price: 40, link: amazon('folding garden kneeler'), notes: 'The kind with handles to help me stand up.' }],
  ['rose', 'Squirrel-proof bird feeder', { price: 35 }],
  ['rose', 'Heirloom tomato seeds', { price: 25, notes: 'Brandywine and Cherokee Purple.' }],
  ['rose', 'Large-print crossword book', { price: 12, qty: 2 }],
  ['milo', 'LEGO dinosaur set', { priority: true, price: 50, link: 'https://www.lego.com', notes: 'He already has the T. rex one.' }],
  ['milo', 'Dinosaur pajamas', { price: 25, size: 'Kids 6' }],
  ['milo', 'Glow-in-the-dark ceiling stars', { price: 15 }],
  ['ivy', 'Watercolor paint set', { priority: true, price: 30, notes: 'One with real brushes, not the plastic ones.' }],
  ['ivy', 'Sketchbook', { price: 15, qty: 2 }],
  ['ivy', 'Unicorn slippers', { price: 22, size: 'Kids 13' }],
];

// Last year's lists: locked, mostly bought.
const PAST = [
  ['alex', 'French press', { price: 30 }],
  ['alex', 'Flannel shirt', { price: 45, size: 'L', color: 'Red plaid' }],
  ['jordan', 'Ticket to Ride', { priority: true, price: 45 }],
  ['jordan', 'Insulated water bottle', { price: 30 }],
  ['sam', 'Chili-growing kit', { price: 28 }],
  ['rose', 'Gardening gloves', { price: 18, size: 'S' }],
  ['milo', 'Toy excavator', { price: 35 }],
];
const PAST_CLAIMS = [[0, 'jordan'], [1, 'rose'], [2, 'alex'], [3, 'sam'], [4, 'rose'], [5, 'alex'], [6, 'sam']];

// [item index, claimer, status]
const CLAIMS = [
  [0, 'jordan', 'claimed'], [1, 'rose', 'bought'],
  [5, 'sam', 'claimed'], [7, 'rose', 'bought'],
  [10, 'alex', 'claimed'],
  [12, 'alex', 'claimed'], [13, 'alex', 'bought'],
  [16, 'rose', 'claimed'], [19, 'jordan', 'bought'],
];

/** Wipes the database and loads the sample family. Returns { me, year } to sign in with. */
export async function loadSample() {
  const all = await Promise.all(COLS.map(getAll));
  await Promise.all(COLS.flatMap((c, i) => all[i].map((r) => store.remove(c, r.id))));

  // Back-dated a week so "Lock lists now" doesn't make every sample item look newly added.
  const t = Date.now() - 7 * 86_400_000;
  const writes = [store.put('settings', 'group', {
    name: 'The Sample Family', admins: ['alex'], createdAt: t,
    units: [{ id: 'ua', name: "Alex's family" }, { id: 'uj', name: "Jordan's family" }],
    years: { [LAST_YEAR]: { lockDate: `${LAST_YEAR}-12-01` }, [THIS_YEAR]: { lockDate: defaultLockDate() } },
  })];
  const UNIT = { alex: 'ua', ivy: 'ua', jordan: 'uj', milo: 'uj' };
  Object.entries(PEOPLE).forEach(([id, p], i) => writes.push(store.put('people', id, { ...p, unit: UNIT[id] || null, sort: i, createdAt: t })));
  const addItems = (list, prefix, year) => {
    const counts = {};
    list.forEach(([owner, title, f], i) => {
      const order = (counts[owner] = (counts[owner] ?? -1) + 1);
      writes.push(store.put('items', `${prefix}${i}`, {
      ownerId: owner, title, link: '', notes: '', price: null, qty: 1, size: '', color: '', priority: false,
      thumb: null, hasPhoto: false, ...f, order, year, createdAt: t + i, addedBy: PEOPLE[owner].managedBy || owner,
      }));
    });
  };
  addItems(ITEMS, 's', THIS_YEAR);
  addItems(PAST, 'p', LAST_YEAR);
  for (const [i, who, status] of CLAIMS) {
    writes.push(store.put('claims', `s${i}`, { ownerId: ITEMS[i][0], claimerId: who, status, year: THIS_YEAR, at: t }));
  }
  for (const [i, who] of PAST_CLAIMS) {
    writes.push(store.put('claims', `p${i}`, { ownerId: PAST[i][0], claimerId: who, status: 'bought', year: LAST_YEAR, at: t }));
  }
  await Promise.all(writes);
  return { me: 'alex', year: THIS_YEAR };
}
