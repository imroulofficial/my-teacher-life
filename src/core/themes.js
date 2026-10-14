// Classroom themes. Colours live in style.css ([data-theme=...] variables); the student
// shirt palette is swapped here because the mini-games pick shirts from SHIRT_COLORS.
import { getState, saveState } from './storage.js';
import { SHIRT_COLORS } from '../mini-games/data.js';
import { t } from '../i18n/index.js';

const VILLAGE_SHIRTS = [...SHIRT_COLORS];

export const THEMES = [
  { id: 'village', icon: '🏡', unlockAt: 0, shirts: VILLAGE_SHIRTS },
  { id: 'city', icon: '🏙️', unlockAt: 30, shirts: ['#e2e8f0', '#93c5fd', '#3b82f6', '#1d4ed8', '#f8fafc', '#60a5fa', '#bfdbfe', '#2563eb'] },
  { id: 'english', icon: '📘', unlockAt: 60, shirts: ['#1e3a8a', '#9f1239', '#1e40af', '#be123c', '#f8fafc', '#172554', '#e11d48', '#334155'] },
  { id: 'international', icon: '🌍', unlockAt: 90, shirts: ['#14b8a6', '#f97316', '#8b5cf6', '#ec4899', '#0ea5e9', '#84cc16', '#f43f5e', '#eab308'] },
  { id: 'gifted', icon: '💎', unlockAt: 120, shirts: ['#7c3aed', '#facc15', '#a855f7', '#eab308', '#f5f3ff', '#6d28d9', '#fde047', '#4c1d95'] },
];
for (const th of THEMES) {
  Object.defineProperty(th, 'name', { get: () => t(`themes.${th.id}.name`) });
  Object.defineProperty(th, 'desc', { get: () => t(`themes.${th.id}.desc`) });
}

export const themeById = (id) => THEMES.find((th) => th.id === id) || THEMES[0];

/** A theme unlocks when its level has been completed (village is always available). */
export const isThemeUnlocked = (th) => th.unlockAt === 0 || getState().unlockedLevel > th.unlockAt;

export function currentTheme() {
  const th = themeById(getState().theme);
  return isThemeUnlocked(th) ? th : THEMES[0];
}

/** Applies a theme to the whole app (CSS variables + shirt palette). */
export function applyTheme(th = currentTheme()) {
  document.documentElement.dataset.theme = th.id;
  SHIRT_COLORS.splice(0, SHIRT_COLORS.length, ...th.shirts);
}

export function setTheme(id) {
  const th = themeById(id);
  if (!isThemeUnlocked(th)) return false;
  getState().theme = th.id;
  saveState();
  applyTheme(th);
  return true;
}

/** Themes unlocked by finishing `level` for the first time. */
export const themesUnlockedBy = (level) => THEMES.filter((th) => th.unlockAt > 0 && th.unlockAt === level);
