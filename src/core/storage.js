// Save game stored in LocalStorage (fully offline).
import { APP } from './config.js';

const DEFAULT_STATE = () => ({
  version: 1,
  teacherName: 'Teacher',
  coins: 150,
  totalCoinsEarned: 0,
  unlockedLevel: 1, // highest level the player may start
  stars: {}, // { [level]: 0..3 }
  bossWins: {}, // { [level]: true } boss levels won (🏅 badge)
  best: {}, // { [level]: best score }
  school: {
    size: 0, // index into SCHOOL_SIZES
    upgrades: {}, // { [upgradeId]: level }
  },
  lastSeen: Date.now(),
  boosts: {
    coinMultiplierUntil: 0,
  },
  goldenStamps: [], // ids of unlocked Golden Stamp designs
  activeStamp: 'classic',
  theme: 'village', // classroom theme id
  settings: {
    sound: true,
    vibration: true,
  },
  stats: {
    levelsPlayed: 0,
    papersMarked: 0,
    cheatersCaught: 0,
    bagsChecked: 0,
    booksSorted: 0,
    adsWatched: 0,
    dailyBonuses: 0,
    perfectLevels: 0, // levels finished with every answer right
    fastestWin: 0, // seconds, fastest level ever won (0 = none yet)
  },
  tutorialsSeen: {}, // { [gameId]: true }
  achievements: {}, // { [id]: unlocked timestamp }
  langsPlayed: [], // languages a level was finished in
});

let state = null;

function merge(base, saved) {
  // Deep-merge saved data over defaults so new fields appear after updates.
  if (Array.isArray(base)) return Array.isArray(saved) ? saved : base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(saved)) {
        out[k] = k in base ? merge(base[k], saved[k]) : saved[k];
      }
    }
    return out;
  }
  return saved === undefined || saved === null ? base : saved;
}

export function loadState() {
  let saved = null;
  try {
    const raw = localStorage.getItem(APP.storageKey);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    console.warn('Save could not be read, starting fresh.', e);
  }
  state = merge(DEFAULT_STATE(), saved);
  return state;
}

export function getState() {
  if (!state) loadState();
  return state;
}

export function saveState() {
  if (!state) return;
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify(state));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

export function resetState() {
  state = DEFAULT_STATE();
  saveState();
  return state;
}
