// 12 achievement badges. Each one checks the save game; unlocked badges are kept in state.achievements.
import { getState, saveState } from './storage.js';
import { CHAPTERS, gameForLevel } from './levels.js';
import { MAX_STORY_LEVEL } from './config.js';
import { currentStreak, celebrate } from './engagement.js';
import { t } from '../i18n/index.js';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const MATCH_LEVELS = range(1, MAX_STORY_LEVEL).filter((l) => gameForLevel(l) === 'match');
const reach = (chapterId) => (s) => [Math.min(s.unlockedLevel, CHAPTERS[chapterId - 1].from), CHAPTERS[chapterId - 1].from];

/** progress(s) returns [current, goal]; a badge unlocks when current >= goal. */
export const ACHIEVEMENTS = [
  { id: 'chapter1', icon: '🍎', progress: (s) => [range(1, 10).filter((l) => s.stars[l] > 0).length, 10] },
  { id: 'perfect', icon: '💯', progress: (s) => [Math.min(1, s.stats.perfectLevels), 1] },
  { id: 'streak7', icon: '🔥', progress: () => [Math.min(7, currentStreak()), 7] },
  { id: 'coins10k', icon: '🪙', progress: (s) => [Math.min(10000, s.totalCoinsEarned), 10000] },
  { id: 'matchMaster', icon: '🔗', progress: (s) => [MATCH_LEVELS.filter((l) => s.stars[l] === 3).length, MATCH_LEVELS.length] },
  { id: 'boss5', icon: '👑', progress: (s) => [Math.min(5, Object.keys(s.bossWins).length), 5] },
  { id: 'bilingual', icon: '🌐', progress: (s) => [['en', 'bn'].filter((l) => s.langsPlayed.includes(l)).length, 2] },
  { id: 'daily10', icon: '🌟', progress: (s) => [Math.min(10, s.stats.dailyBonuses), 10] },
  { id: 'speedy', icon: '⚡', progress: (s) => [s.stats.fastestWin > 0 && s.stats.fastestWin < 15 ? 1 : 0, 1] },
  { id: 'chapter5', icon: '🏅', progress: reach(5) },
  { id: 'chapter8', icon: '🗂️', progress: reach(8) },
  { id: 'chapter12', icon: '🎓', progress: reach(12) },
];
for (const a of ACHIEVEMENTS) {
  Object.defineProperty(a, 'name', { get: () => t(`achievements.list.${a.id}.name`) });
  Object.defineProperty(a, 'desc', { get: () => t(`achievements.list.${a.id}.desc`) });
}

export const isUnlocked = (id) => !!getState().achievements[id];
export const unlockedCount = () => ACHIEVEMENTS.filter((a) => isUnlocked(a.id)).length;

/**
 * Unlocks every badge whose goal is met. `quiet` skips the celebration
 * (used at start-up so badges earned before this update appear without fanfare).
 */
export function checkAchievements({ quiet = false } = {}) {
  const s = getState();
  const fresh = ACHIEVEMENTS.filter((a) => {
    if (s.achievements[a.id]) return false;
    const [cur, goal] = a.progress(s);
    return cur >= goal;
  });
  if (!fresh.length) return [];
  fresh.forEach((a) => (s.achievements[a.id] = Date.now()));
  saveState();
  if (!quiet) {
    // One pill per check: the badge's name, or a count when several unlock together.
    const text = fresh.length === 1 ? t('achievements.unlocked', { icon: fresh[0].icon, name: fresh[0].name }) : t('achievements.unlockedMany', { icons: fresh.map((a) => a.icon).join(''), n: fresh.length });
    celebrate({ cls: 'achievement', text, ms: 2600, sound: 'star' });
  }
  return fresh;
}

/** Called when a level ends: records what the badges need, then checks them. */
export function recordLevelResult({ passed, correct, wrong, seconds, lang }) {
  const s = getState();
  if (!s.langsPlayed.includes(lang)) s.langsPlayed.push(lang);
  if (passed && wrong === 0 && correct > 0) s.stats.perfectLevels++;
  if (passed && (!s.stats.fastestWin || seconds < s.stats.fastestWin)) s.stats.fastestWin = Math.round(seconds * 10) / 10;
  saveState();
  return checkAchievements();
}
