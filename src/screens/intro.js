// Level intro card: which mini-game and how to play it.
import { h, btn } from '../core/ui.js';
import { getState, saveState } from '../core/storage.js';
import { go } from '../core/router.js';
import { GAME_INFO, gameForLevel, chapterOf, levelLabel, roundsFor, bossStages } from '../core/levels.js';
import { topBar } from './common.js';
import { t, digits } from '../i18n/index.js';

export default {
  render(root, { level }) {
    const s = getState();
    if (level > s.unlockedLevel) level = s.unlockedLevel;
    const gameId = gameForLevel(level);
    const info = GAME_INFO[gameId];
    const ch = chapterOf(level);
    const isNew = !s.tutorialsSeen[gameId];
    const best = s.stars[level] || 0;
    const stages = bossStages(level);
    const bar = topBar({ title: levelLabel(level), onBack: () => go('map', { level }) });

    const card = h(
      'div',
      { class: 'intro-card pop-in', style: { '--accent': info.color } },
      ch ? h('div', { class: 'intro-chapter' }, t('level.chapterLine', { icon: ch.icon, n: ch.id, name: ch.name })) : h('div', { class: 'intro-chapter' }, `🌟 ${t('level.endlessTitle')}`),
      h('div', { class: 'intro-icon bob' }, info.icon),
      h('div', { class: 'intro-title' }, info.name),
      isNew ? h('div', { class: 'new-badge' }, t('level.newLesson')) : null,
      h('div', { class: 'intro-meta' }, t('level.meta', { n: roundsFor(level, gameId), stars: '★'.repeat(best) + '☆'.repeat(3 - best) })),
      stages
        ? h(
            'div',
            { class: 'boss-stages' },
            stages.map((g, i) => h('div', { class: 'boss-stage-chip' }, `${digits(i + 1)}. ${GAME_INFO[g].icon} ${GAME_INFO[g].name}`)),
          )
        : null,
      h('div', { class: 'howto-title' }, t('level.howToTitle')),
      h(
        'ol',
        { class: 'howto' },
        t(`howTo.${gameId}`).map((line) => h('li', {}, line)),
      ),
      btn(t('level.start'), {
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
