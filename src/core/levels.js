// Chapters, level table and difficulty curve.
import { MAX_STORY_LEVEL } from './config.js';
import { t } from '../i18n/index.js';

export const GAME_INFO = {
  spelling: { get name() { return t('games.spelling'); }, icon: '📝', color: '#ff6b6b' },
  qa: { get name() { return t('games.qa'); }, icon: '🙋', color: '#4d96ff' },
  match: { get name() { return t('games.match'); }, icon: '🔗', color: '#3bceac' },
  stamp: { get name() { return t('games.stamp'); }, icon: '💯', color: '#9b5de5' },
  cheating: { get name() { return t('games.cheating'); }, icon: '📡', color: '#ff9f1c' },
  security: { get name() { return t('games.security'); }, icon: '🚨', color: '#f15bb5' },
  library: { get name() { return t('games.library'); }, icon: '📚', color: '#00bbf9' },
  attendance: { get name() { return t('games.attendance'); }, icon: '🙋', color: '#22a06b' },
  math: { get name() { return t('games.math'); }, icon: '🧮', color: '#2563eb' },
  homework: { get name() { return t('games.homework'); }, icon: '📒', color: '#e76f51' },
};

export const CHAPTERS = [
  {
    id: 1,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🍎',
    bg: 'linear-gradient(160deg,#ffd166,#ff9f1c)',
    from: 1,
    to: 10,
    intro: ['spelling', 'qa', 'match'],
    pool: ['spelling', 'qa', 'match'],
  },
  {
    id: 2,
    get name() { return t(`chapters.${this.id}`); },
    icon: '📝',
    bg: 'linear-gradient(160deg,#a0c4ff,#4d96ff)',
    from: 11,
    to: 20,
    intro: ['cheating', 'stamp'],
    pool: ['cheating', 'stamp', 'spelling', 'qa', 'match'],
  },
  {
    id: 3,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🚨',
    bg: 'linear-gradient(160deg,#ffadad,#f15bb5)',
    from: 21,
    to: 30,
    intro: ['security'],
    pool: ['security', 'cheating', 'stamp', 'qa', 'spelling', 'match'],
  },
  {
    id: 4,
    get name() { return t(`chapters.${this.id}`); },
    icon: '📚',
    bg: 'linear-gradient(160deg,#9bf6ff,#00bbf9)',
    from: 31,
    to: 40,
    intro: ['library'],
    pool: ['library', 'security', 'match', 'cheating', 'stamp', 'qa', 'spelling'],
  },
  {
    id: 5,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🏆',
    bg: 'linear-gradient(160deg,#caffbf,#3bceac)',
    from: 41,
    to: 50,
    intro: [],
    pool: ['library', 'security', 'cheating', 'stamp', 'match', 'qa', 'spelling'],
  },
  // Chapters 6-12: harder remixes, the three new lessons, and a finale on every 10th level.
  {
    id: 6,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🏫',
    bg: 'linear-gradient(160deg,#fbc4ab,#f08080)',
    from: 51,
    to: 60,
    intro: [],
    pool: ['spelling', 'cheating', 'qa', 'stamp', 'match', 'security', 'library', 'qa', 'spelling'],
    finale: 'stamp',
  },
  {
    id: 7,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🧭',
    bg: 'linear-gradient(160deg,#b9fbc0,#22a06b)',
    from: 61,
    to: 70,
    intro: ['attendance'],
    pool: ['stamp', 'attendance', 'spelling', 'security', 'attendance', 'qa', 'cheating', 'match'],
    finale: 'attendance',
  },
  {
    id: 8,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🗂️',
    bg: 'linear-gradient(160deg,#bde0fe,#2563eb)',
    from: 71,
    to: 80,
    intro: ['math'],
    pool: ['attendance', 'math', 'library', 'stamp', 'math', 'spelling', 'attendance', 'qa'],
    finale: 'math',
  },
  {
    id: 9,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🏛️',
    bg: 'linear-gradient(160deg,#ffd6a5,#e76f51)',
    from: 81,
    to: 90,
    intro: ['homework'],
    pool: ['math', 'homework', 'security', 'attendance', 'homework', 'match', 'math', 'cheating'],
    finale: 'homework',
  },
  {
    id: 10,
    get name() { return t(`chapters.${this.id}`); },
    icon: '📜',
    bg: 'linear-gradient(160deg,#fdffb6,#f4a261)',
    from: 91,
    to: 100,
    intro: [],
    pool: ['attendance', 'math', 'homework', 'spelling', 'qa', 'stamp', 'library', 'security', 'match'],
    finale: 'math',
  },
  {
    id: 11,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🌍',
    bg: 'linear-gradient(160deg,#a0e7e5,#0096c7)',
    from: 101,
    to: 110,
    intro: [],
    pool: ['homework', 'cheating', 'math', 'attendance', 'match', 'spelling', 'homework', 'qa', 'library'],
    finale: 'homework',
  },
  {
    id: 12,
    get name() { return t(`chapters.${this.id}`); },
    icon: '🎓',
    bg: 'linear-gradient(160deg,#e0aaff,#7b2cbf)',
    from: 111,
    to: MAX_STORY_LEVEL,
    intro: [],
    pool: ['math', 'attendance', 'homework', 'security', 'stamp', 'cheating', 'math', 'homework', 'attendance'],
    finale: 'attendance',
  },
];

/** First story level of each newer lesson; their difficulty ramps from there. */
export const NEW_GAME_START = { attendance: 61, math: 71, homework: 81 };
const FIRST_STORY_END = 50; // levels 1-50 keep their original difficulty curve

export function chapterOf(level) {
  return CHAPTERS.find((c) => level >= c.from && level <= c.to) || null;
}

/** Deterministic game for a level. Levels after the story are endless "Teacher of the Year" levels. */
export function gameForLevel(level) {
  const ch = chapterOf(level);
  if (!ch) {
    const all = Object.keys(GAME_INFO);
    // simple deterministic hash so the same endless level is always the same game
    return all[(level * 7 + 3) % all.length];
  }
  if (ch.finale && level === ch.to) return ch.finale;
  const idx = level - ch.from;
  if (idx < ch.intro.length) return ch.intro[idx];
  return ch.pool[(idx - ch.intro.length) % ch.pool.length];
}

/**
 * 0 (easy) .. 1 (hard). The original lessons ramp over levels 1-50 and stay at full difficulty
 * after that (later levels add more tasks instead). The newer lessons ramp over the 40 levels
 * after they are introduced, so each one starts gently.
 */
export function difficultyFor(level, game) {
  const start = NEW_GAME_START[game];
  if (start) return Math.min(1, Math.max(0, (level - start) / 40));
  return Math.min(1, (level - 1) / (FIRST_STORY_END - 1));
}

/** Number of tasks (papers, questions, students…) in a level. */
export function roundsFor(level, game) {
  const d = difficultyFor(level, game);
  // attendance: two classes of 5-12 students each
  const base = { spelling: 6, qa: 5, match: 4, stamp: 6, cheating: 5, security: 6, library: 6, attendance: 10, math: 6, homework: 6 }[game] || 5;
  const extra = { spelling: 6, qa: 4, match: 3, stamp: 6, cheating: 5, security: 6, library: 12, attendance: 14, math: 4, homework: 6 }[game] || 4;
  // Original lessons get one more task from level 81 and two from 111 (the newer ones ramp on their own).
  const later = NEW_GAME_START[game] || level <= FIRST_STORY_END ? 0 : Math.min(2, Math.floor((level - 51) / 30));
  const endless = level > MAX_STORY_LEVEL ? Math.min(2, Math.floor((level - MAX_STORY_LEVEL) / 20)) : 0;
  return base + Math.round(extra * d) + later + (game === 'attendance' ? 0 : endless);
}

export function baseCoinsFor(level) {
  return 30 + level * 8;
}

export function levelLabel(level) {
  return t(level > MAX_STORY_LEVEL ? 'level.labelEndless' : 'level.label', { n: level });
}
