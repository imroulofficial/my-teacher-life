// Chapters, level table and difficulty curve.
import { MAX_STORY_LEVEL } from './config.js';

export const GAME_INFO = {
  spelling: { name: 'Spelling & Picture Check', icon: '📝', color: '#ff6b6b' },
  qa: { name: 'Classroom Q&A', icon: '🙋', color: '#4d96ff' },
  match: { name: 'Line Match Assessment', icon: '🔗', color: '#3bceac' },
  stamp: { name: 'Test Result Reaction', icon: '💯', color: '#9b5de5' },
  cheating: { name: 'Anti-Cheating Radar', icon: '📡', color: '#ff9f1c' },
  security: { name: 'Morning Security Scan', icon: '🚨', color: '#f15bb5' },
  library: { name: 'Library Book Sorting', icon: '📚', color: '#00bbf9' },
};

export const CHAPTERS = [
  {
    id: 1,
    name: 'First Day of School',
    icon: '🍎',
    bg: 'linear-gradient(160deg,#ffd166,#ff9f1c)',
    from: 1,
    to: 10,
    intro: ['spelling', 'qa', 'match'],
    pool: ['spelling', 'qa', 'match'],
  },
  {
    id: 2,
    name: 'Exam Season',
    icon: '📝',
    bg: 'linear-gradient(160deg,#a0c4ff,#4d96ff)',
    from: 11,
    to: 20,
    intro: ['cheating', 'stamp'],
    pool: ['cheating', 'stamp', 'spelling', 'qa', 'match'],
  },
  {
    id: 3,
    name: 'Safety Week',
    icon: '🚨',
    bg: 'linear-gradient(160deg,#ffadad,#f15bb5)',
    from: 21,
    to: 30,
    intro: ['security'],
    pool: ['security', 'cheating', 'stamp', 'qa', 'spelling', 'match'],
  },
  {
    id: 4,
    name: 'Library Week',
    icon: '📚',
    bg: 'linear-gradient(160deg,#9bf6ff,#00bbf9)',
    from: 31,
    to: 40,
    intro: ['library'],
    pool: ['library', 'security', 'match', 'cheating', 'stamp', 'qa', 'spelling'],
  },
  {
    id: 5,
    name: "Principal's Challenge",
    icon: '🏆',
    bg: 'linear-gradient(160deg,#caffbf,#3bceac)',
    from: 41,
    to: MAX_STORY_LEVEL,
    intro: [],
    pool: ['library', 'security', 'cheating', 'stamp', 'match', 'qa', 'spelling'],
  },
];

export function chapterOf(level) {
  return CHAPTERS.find((c) => level >= c.from && level <= c.to) || null;
}

/** Deterministic game for a level. Levels 51+ are endless "Teacher of the Year" levels. */
export function gameForLevel(level) {
  const ch = chapterOf(level);
  if (!ch) {
    const all = Object.keys(GAME_INFO);
    // simple deterministic hash so the same endless level is always the same game
    return all[(level * 7 + 3) % all.length];
  }
  const idx = level - ch.from;
  if (idx < ch.intro.length) return ch.intro[idx];
  return ch.pool[(idx - ch.intro.length) % ch.pool.length];
}

/** 0 (easy) .. 1 (hard). Ramps across the story and keeps growing slowly after. */
export function difficultyFor(level) {
  if (level <= MAX_STORY_LEVEL) return Math.min(1, (level - 1) / (MAX_STORY_LEVEL - 1));
  return 1;
}

/** Number of tasks (papers, questions, students…) in a level. */
export function roundsFor(level, game) {
  const d = difficultyFor(level);
  const base = { spelling: 6, qa: 5, match: 4, stamp: 6, cheating: 5, security: 6, library: 6 }[game] || 5;
  const extra = { spelling: 6, qa: 4, match: 3, stamp: 6, cheating: 5, security: 6, library: 12 }[game] || 4;
  const endless = level > MAX_STORY_LEVEL ? Math.min(4, Math.floor((level - MAX_STORY_LEVEL) / 10)) : 0;
  return base + Math.round(extra * d) + endless;
}

export function baseCoinsFor(level) {
  return 30 + level * 8;
}

export function levelLabel(level) {
  return level > MAX_STORY_LEVEL ? `Level ${level} ★` : `Level ${level}`;
}
