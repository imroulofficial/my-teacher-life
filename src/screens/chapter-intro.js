// Chapter intro: a full-screen card the first time a player enters a chapter.
// Shows the chapter, a short description and a preview of its new lesson(s).
// Closes by itself after 4 seconds, or on tap.
import { h } from '../core/ui.js';
import { getState, saveState } from '../core/storage.js';
import { sfx } from '../core/audio.js';
import { CHAPTERS, GAME_INFO, BOSS_STAGES } from '../core/levels.js';
import { t } from '../i18n/index.js';

const SHOW_MS = 4000;

/** Chapters the player was already playing before this screen existed count as seen. */
export function initChapterIntros() {
  const s = getState();
  if (s.chapterIntrosReady) return;
  for (const ch of CHAPTERS) if (ch.from < s.unlockedLevel) s.chaptersSeen[ch.id] = true;
  s.chapterIntrosReady = true;
  saveState();
}

export const chapterIntroPending = (ch) => !!ch && !getState().chaptersSeen[ch.id];

function previewFor(ch) {
  const boss = Object.keys(BOSS_STAGES).map(Number).find((l) => l >= ch.from && l <= ch.to);
  if (ch.intro.length) {
    const first = ch.intro[0];
    return h(
      'div',
      { class: 'ch-intro-preview' },
      h('div', { class: 'ch-intro-new' }, t(ch.intro.length > 1 ? 'chapterIntro.newLessons' : 'chapterIntro.newLesson')),
      h('div', { class: 'ch-intro-games' }, ch.intro.map((g) => h('div', { class: 'ch-intro-game' }, h('span', { class: 'ch-intro-game-icon' }, GAME_INFO[g].icon), h('span', {}, GAME_INFO[g].name)))),
      ch.intro.length === 1 ? h('div', { class: 'ch-intro-tip' }, t(`howTo.${first}`)[1]) : null,
      boss ? h('div', { class: 'ch-intro-boss' }, t('chapterIntro.boss', { n: boss })) : null,
    );
  }
  // No new lesson: show the mix (and the boss when the chapter has one).
  const mix = [...new Set(ch.pool)];
  return h(
    'div',
    { class: 'ch-intro-preview' },
    h('div', { class: 'ch-intro-new' }, boss && ch.id === 6 ? t('chapterIntro.newBoss') : t('chapterIntro.mixed')),
    h('div', { class: 'ch-intro-icons' }, mix.map((g) => h('span', {}, GAME_INFO[g].icon))),
    boss ? h('div', { class: 'ch-intro-boss' }, t('chapterIntro.boss', { n: boss })) : null,
  );
}

/** Shows the intro card for `ch` inside `root` and marks it seen. */
export function showChapterIntro(root, ch) {
  const s = getState();
  s.chaptersSeen[ch.id] = true;
  saveState();
  const overlay = h(
    'div',
    { class: 'ch-intro', style: { background: ch.bg }, role: 'dialog' },
    h(
      'div',
      { class: 'ch-intro-card pop-in' },
      h('div', { class: 'ch-intro-icon bob' }, ch.icon),
      h('div', { class: 'ch-intro-num' }, t('level.chapter', { n: ch.id })),
      h('div', { class: 'ch-intro-title' }, ch.name),
      h('div', { class: 'ch-intro-range' }, t('chapterIntro.levels', { from: ch.from, to: ch.to })),
      h('p', { class: 'ch-intro-desc' }, t(`chapterDesc.${ch.id}`)),
      previewFor(ch),
      h('div', { class: 'ch-intro-tap' }, t('chapterIntro.tap')),
      h('div', { class: 'ch-intro-timer' }, h('div', { class: 'ch-intro-timer-fill', style: { animationDuration: SHOW_MS + 'ms' } })),
    ),
  );
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    clearTimeout(timer);
    overlay.classList.add('out');
    setTimeout(() => overlay.remove(), 300);
  };
  const timer = setTimeout(close, SHOW_MS);
  overlay.addEventListener('click', close);
  root.appendChild(overlay);
  sfx('star');
  return { close, get open() { return !closed; } };
}
