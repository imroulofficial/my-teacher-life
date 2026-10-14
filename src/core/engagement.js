// Friendly engagement touches: daily streak, daily bonus, progress, near-miss
// encouragement and coin milestones. Everything is local (works offline) and
// purely positive — no guilt messages, timers or pressure.
import { h } from './ui.js';
import { sfx } from './audio.js';
import { getState } from './storage.js';
import { addCoins } from './economy.js';
import { MAX_STORY_LEVEL } from './config.js';
import { t, digits } from '../i18n/index.js';

const KEY_STREAK = 'mtl_streak';
const KEY_BONUS = 'mtl_last_daily_bonus';
const KEY_MILESTONE = 'mtl_last_milestone';
export const ENGAGEMENT_KEYS = [KEY_STREAK, KEY_BONUS, KEY_MILESTONE];

export const DAILY_BONUS = 50;
export const MILESTONES = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage is optional for these extras */
  }
}

/** Local calendar date as YYYY-MM-DD (the player's own midnight, not UTC). */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localDate(d);
}

// ---------------------------------------------------------------- streak

/** Current streak to display: still alive if the last play was today or yesterday. */
export function currentStreak() {
  const s = read(KEY_STREAK, null);
  if (!s || !s.count) return 0;
  return s.lastPlayedDate === localDate() || s.lastPlayedDate === yesterday() ? s.count : 0;
}

function bumpStreak() {
  const today = localDate();
  const s = read(KEY_STREAK, { count: 0, lastPlayedDate: null });
  if (s.lastPlayedDate === today) return s.count;
  const count = s.lastPlayedDate === yesterday() ? (s.count || 0) + 1 : 1;
  write(KEY_STREAK, { count, lastPlayedDate: today });
  return count;
}

/** Home-screen chip ("🔥 3"), or null while the streak is below 2 days. */
export function streakChip() {
  const n = currentStreak();
  if (n < 2) return null;
  const label = t('engage.streak', { n });
  return h('div', { class: `streak-chip ${n >= 7 ? 'hot' : ''}`, title: label, 'aria-label': label }, `🔥 ${digits(n)}`);
}

// ---------------------------------------------------------------- daily bonus

/**
 * Call once when a level ends. Updates the streak and pays the daily bonus on the
 * first finished level of the day. Returns the bonus coins paid (0 if already paid).
 */
export function recordLevelPlayed() {
  bumpStreak();
  const today = localDate();
  if (read(KEY_BONUS, null) === today) return 0;
  write(KEY_BONUS, today);
  // Queue the toast first so a milestone reached by these coins shows after it.
  celebrate({ cls: 'daily-bonus', text: t('engage.dailyBonus', { n: DAILY_BONUS }), ms: 2500, sound: 'coin' });
  addCoins(DAILY_BONUS);
  return DAILY_BONUS;
}

// ---------------------------------------------------------------- progress

/** Story levels with at least one star, as a whole percentage (rounded down). */
export function progressInfo() {
  const stars = getState().stars;
  let done = 0;
  for (let l = 1; l <= MAX_STORY_LEVEL; l++) if (stars[l] > 0) done++;
  return { done, total: MAX_STORY_LEVEL, pct: Math.floor((done / MAX_STORY_LEVEL) * 100) };
}

export function progressCard() {
  const { pct } = progressInfo();
  const fill = h('div', { class: 'progress-fill' });
  const card = h(
    'div',
    { class: 'progress-card' },
    h('div', { class: 'progress-text' }, t('engage.progress', { pct })),
    h('div', { class: 'progress-track' }, fill),
  );
  // Fill from 0 to the current value once the card is on screen (CSS transition).
  requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = pct + '%')));
  return card;
}

// ---------------------------------------------------------------- celebration overlay (non-blocking)

const queue = [];
let showing = false;

function celebrate(item) {
  queue.push(item);
  if (showing) return;
  showing = true;
  setTimeout(next, 450);
}

function next() {
  const item = queue.shift();
  if (!item) {
    showing = false;
    return;
  }
  const el = h('div', { class: `celebrate ${item.cls}` }, h('div', { class: 'celebrate-text' }, item.text));
  if (item.confetti) {
    const colors = ['#f97316', '#f59e0b', '#facc15', '#ffffff'];
    for (let i = 0; i < 36; i++) {
      el.appendChild(
        h('i', {
          class: 'celebrate-bit',
          style: { left: Math.random() * 100 + '%', background: colors[i % 4], animationDelay: Math.random() * 0.3 + 's' },
        }),
      );
    }
  }
  document.body.appendChild(el);
  if (item.sound) sfx(item.sound);
  setTimeout(() => el.classList.add('out'), item.ms);
  setTimeout(() => {
    el.remove();
    next();
  }, item.ms + 350);
}
