// Level map: 5 chapters + endless levels.
import { h, btn, toast } from '../core/ui.js';
import { getState } from '../core/storage.js';
import { go } from '../core/router.js';
import { CHAPTERS, GAME_INFO, gameForLevel } from '../core/levels.js';
import { MAX_STORY_LEVEL } from '../core/config.js';
import { topBar } from './common.js';
import { sfx } from '../core/audio.js';

function levelNode(level, s) {
  const unlocked = level <= s.unlockedLevel;
  const stars = s.stars[level] || 0;
  const game = GAME_INFO[gameForLevel(level)];
  const current = level === s.unlockedLevel;
  const node = h(
    'button',
    { class: `level-node ${unlocked ? 'unlocked' : 'locked'} ${current ? 'current' : ''}`, style: unlocked ? { '--node': game.color } : {}, dataset: { level } },
    h('span', { class: 'node-icon' }, unlocked ? game.icon : '🔒'),
    h('span', { class: 'node-num' }, level),
    h('span', { class: 'node-stars' }, unlocked ? [0, 1, 2].map((i) => h('span', { class: i < stars ? 'on' : '' }, '★')) : ''),
  );
  node.addEventListener('click', () => {
    if (!unlocked) {
      sfx('wrong');
      toast(`🔒 Finish level ${s.unlockedLevel} first!`);
      return;
    }
    sfx('tap');
    go('intro', { level });
  });
  return node;
}

export default {
  render(root, params = {}) {
    const s = getState();
    const bar = topBar({ title: '🗺️ Levels', onBack: () => go('home') });
    const list = h('div', { class: 'map-list' });

    for (const ch of CHAPTERS) {
      const done = Array.from({ length: ch.to - ch.from + 1 }, (_, i) => s.stars[ch.from + i] || 0);
      const chStars = done.reduce((a, b) => a + b, 0);
      const locked = ch.from > s.unlockedLevel;
      const nodes = [];
      for (let l = ch.from; l <= ch.to; l++) nodes.push(levelNode(l, s));
      list.appendChild(
        h(
          'div',
          { class: `chapter-card ${locked ? 'locked' : ''}` },
          h(
            'div',
            { class: 'chapter-head', style: { background: ch.bg } },
            h('div', { class: 'chapter-icon' }, ch.icon),
            h('div', {}, h('div', { class: 'chapter-num' }, `Chapter ${ch.id}`), h('div', { class: 'chapter-name' }, ch.name)),
            h('div', { class: 'chapter-stars' }, `★ ${chStars}/${done.length * 3}`),
          ),
          h('div', { class: 'level-grid' }, nodes),
        ),
      );
    }

    // Endless levels after the story.
    const endlessUnlocked = s.unlockedLevel > MAX_STORY_LEVEL;
    list.appendChild(
      h(
        'div',
        { class: `chapter-card ${endlessUnlocked ? '' : 'locked'}` },
        h(
          'div',
          { class: 'chapter-head', style: { background: 'linear-gradient(160deg,#ffd23f,#f15bb5)' } },
          h('div', { class: 'chapter-icon' }, '🌟'),
          h('div', {}, h('div', { class: 'chapter-num' }, `Levels ${MAX_STORY_LEVEL + 1}+`), h('div', { class: 'chapter-name' }, 'Teacher of the Year')),
        ),
        h(
          'div',
          { class: 'p-4 text-center' },
          endlessUnlocked
            ? btn(`Play Level ${s.unlockedLevel}`, { color: 'green', size: 'lg', icon: '▶', onClick: () => go('intro', { level: s.unlockedLevel }) })
            : h('div', { class: 'opacity-70' }, `🔒 Complete all ${MAX_STORY_LEVEL} story levels to unlock endless mode.`),
        ),
      ),
    );

    root.append(bar, list);
    // Scroll to the requested/current level.
    const target = Math.min(params.level || s.unlockedLevel, MAX_STORY_LEVEL);
    requestAnimationFrame(() => {
      const el = list.querySelector(`[data-level="${target}"]`);
      if (el) el.scrollIntoView({ block: 'center' });
    });
    return () => bar.destroy();
  },
  onBack() {
    go('home');
    return true;
  },
};
