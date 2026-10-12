// Level intro card: which mini-game and how to play it.
import { h, btn } from '../core/ui.js';
import { getState, saveState } from '../core/storage.js';
import { go } from '../core/router.js';
import { GAME_INFO, gameForLevel, chapterOf, levelLabel, roundsFor } from '../core/levels.js';
import { GAMES } from '../mini-games/index.js';
import { topBar } from './common.js';

export default {
  render(root, { level }) {
    const s = getState();
    if (level > s.unlockedLevel) level = s.unlockedLevel;
    const gameId = gameForLevel(level);
    const info = GAME_INFO[gameId];
    const ch = chapterOf(level);
    const isNew = !s.tutorialsSeen[gameId];
    const best = s.stars[level] || 0;
    const bar = topBar({ title: levelLabel(level), onBack: () => go('map', { level }) });

    const card = h(
      'div',
      { class: 'intro-card pop-in', style: { '--accent': info.color } },
      ch ? h('div', { class: 'intro-chapter' }, `${ch.icon} Chapter ${ch.id}: ${ch.name}`) : h('div', { class: 'intro-chapter' }, '🌟 Teacher of the Year'),
      h('div', { class: 'intro-icon bob' }, info.icon),
      h('div', { class: 'intro-title' }, info.name),
      isNew ? h('div', { class: 'new-badge' }, 'NEW LESSON!') : null,
      h('div', { class: 'intro-meta' }, `📋 ${roundsFor(level, gameId)} tasks  ·  Best: ${'★'.repeat(best)}${'☆'.repeat(3 - best)}`),
      h('div', { class: 'howto-title' }, 'How to play'),
      h(
        'ol',
        { class: 'howto' },
        GAMES[gameId].howTo.map((t) => h('li', {}, t)),
      ),
      btn('START', {
        color: 'green',
        size: 'xxl',
        icon: '▶',
        cls: 'pulse-soft',
        onClick: () => {
          s.tutorialsSeen[gameId] = true;
          saveState();
          go('game', { level });
        },
      }),
    );
    root.append(bar, h('div', { class: 'intro-wrap' }, card));
    return () => bar.destroy();
  },
  onBack() {
    go('map');
    return true;
  },
};
