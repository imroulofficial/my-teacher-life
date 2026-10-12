// Coins, school upgrades, boosts and offline earnings.
import { getState, saveState } from './storage.js';
import { OFFLINE, BOOSTS } from './config.js';

export const SCHOOL_SIZES = [
  { id: 'hut', name: 'Village Schoolhouse', icon: '🏡', cost: 0, incomeMult: 1, maxUpgrade: 3 },
  { id: 'small', name: 'Small School', icon: '🏫', cost: 2500, incomeMult: 1.5, maxUpgrade: 5 },
  { id: 'medium', name: 'Town School', icon: '🏢', cost: 12000, incomeMult: 2.2, maxUpgrade: 7 },
  { id: 'large', name: 'City Academy', icon: '🏛️', cost: 50000, incomeMult: 3.2, maxUpgrade: 9 },
  { id: 'campus', name: 'Grand Campus', icon: '🏰', cost: 200000, incomeMult: 5, maxUpgrade: 12 },
];

export const UPGRADES = [
  { id: 'classroom', name: 'Classrooms', icon: '✏️', desc: 'More desks, more students.', baseCost: 120, income: 12, levelBonus: 0.03 },
  { id: 'sciencelab', name: 'Science Lab', icon: '🔬', desc: 'Bubbling beakers boost learning.', baseCost: 250, income: 22, levelBonus: 0.04 },
  { id: 'library', name: 'Library', icon: '📚', desc: 'Shelves full of stories.', baseCost: 400, income: 30, levelBonus: 0.04 },
  { id: 'computerlab', name: 'Computer Lab', icon: '💻', desc: 'Coding club unlocked!', baseCost: 700, income: 45, levelBonus: 0.05 },
  { id: 'playground', name: 'Playground', icon: '🎠', desc: 'Happy students learn faster.', baseCost: 1000, income: 60, levelBonus: 0.05 },
  { id: 'cafeteria', name: 'Cafeteria', icon: '🍱', desc: 'Healthy lunches for everyone.', baseCost: 1600, income: 85, levelBonus: 0.06 },
  { id: 'artstudio', name: 'Art Studio', icon: '🎨', desc: 'Paint, clay and glitter.', baseCost: 2400, income: 120, levelBonus: 0.06 },
  { id: 'sportshall', name: 'Sports Hall', icon: '🏀', desc: 'Trophies on every wall.', baseCost: 3500, income: 170, levelBonus: 0.07 },
];

export function upgradeLevel(id) {
  return getState().school.upgrades[id] || 0;
}

export function upgradeCost(up) {
  const lvl = upgradeLevel(up.id);
  return Math.round(up.baseCost * Math.pow(1.65, lvl));
}

export function currentSize() {
  return SCHOOL_SIZES[getState().school.size] || SCHOOL_SIZES[0];
}

export function nextSize() {
  return SCHOOL_SIZES[getState().school.size + 1] || null;
}

/** Coins earned per hour while the player is away. */
export function incomePerHour() {
  let base = 20;
  for (const up of UPGRADES) base += up.income * upgradeLevel(up.id);
  return Math.round(base * currentSize().incomeMult);
}

/** Multiplier applied to coins won in levels (from upgrades + boosts). */
export function levelCoinMultiplier() {
  let m = 1;
  for (const up of UPGRADES) m += up.levelBonus * upgradeLevel(up.id);
  m *= 1 + 0.1 * getState().school.size;
  if (isBoostActive()) m *= BOOSTS.goldenStampMultiplier;
  return m;
}

export function isBoostActive() {
  return getState().boosts.coinMultiplierUntil > Date.now();
}

export function boostRemainingMs() {
  return Math.max(0, getState().boosts.coinMultiplierUntil - Date.now());
}

export function activateCoinBoost(minutes = BOOSTS.goldenStampMinutes) {
  const s = getState();
  const from = Math.max(Date.now(), s.boosts.coinMultiplierUntil);
  s.boosts.coinMultiplierUntil = from + minutes * 60000;
  saveState();
}

export function addCoins(n) {
  const s = getState();
  n = Math.max(0, Math.round(n));
  s.coins += n;
  s.totalCoinsEarned += n;
  saveState();
  window.dispatchEvent(new CustomEvent('mtl:coins'));
  return n;
}

export function spendCoins(n) {
  const s = getState();
  if (s.coins < n) return false;
  s.coins -= n;
  saveState();
  window.dispatchEvent(new CustomEvent('mtl:coins'));
  return true;
}

export function buyUpgrade(up) {
  const lvl = upgradeLevel(up.id);
  if (lvl >= currentSize().maxUpgrade) return 'max';
  const cost = upgradeCost(up);
  if (!spendCoins(cost)) return 'funds';
  getState().school.upgrades[up.id] = lvl + 1;
  saveState();
  return 'ok';
}

export function buyNextSize() {
  const nx = nextSize();
  if (!nx) return 'max';
  if (!spendCoins(nx.cost)) return 'funds';
  getState().school.size++;
  saveState();
  return 'ok';
}

/** Grant shown in the School screen when funds are short (rewarded ad). */
export function grantAmountFor(cost) {
  const missing = Math.max(0, cost - getState().coins);
  // "Huge" grant: covers what's missing plus a 50% bonus of the cost.
  return Math.round(missing + cost * 0.5);
}

// ---------------------------------------------------------------------------
// Offline earnings
// ---------------------------------------------------------------------------

/**
 * Calculates earnings since the player was last seen.
 * Returns null if the absence is too short to matter.
 */
export function computeOfflineEarnings() {
  const s = getState();
  const now = Date.now();
  const away = now - (s.lastSeen || now);
  if (away < OFFLINE.minCollectSeconds * 1000) return null;
  const cappedMs = Math.min(away, OFFLINE.maxHours * 3600000);
  const hours = cappedMs / 3600000;
  const coins = Math.max(1, Math.floor(incomePerHour() * hours));
  return {
    awayMs: away,
    cappedMs,
    hours,
    coins,
    canAd: hours >= OFFLINE.minHoursForAdOffer,
    adMultiplier: hours >= OFFLINE.tripleAfterHours ? 3 : 2,
    capped: away > OFFLINE.maxHours * 3600000,
  };
}

export function touchLastSeen() {
  getState().lastSeen = Date.now();
  saveState();
}
