// Achievements: 12 badges with locked/unlocked states. Tap a badge for its description and progress.
import { h, modal, fmt } from '../core/ui.js';
import { getState } from '../core/storage.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { ACHIEVEMENTS, isUnlocked, unlockedCount } from '../core/achievements.js';
import { topBar } from './common.js';
import { t } from '../i18n/index.js';

function showBadge(a) {
  const s = getState();
  const un = isUnlocked(a.id);
  const [cur, goal] = a.progress(s);
  sfx(un ? 'star' : 'tap');
  modal({
    title: a.name,
    cls: 'badge-modal',
    body: h(
      'div',
      { class: 'text-center' },
      h('div', { class: `badge-big ${un ? '' : 'locked'}` }, a.icon),
      h('p', { class: 'badge-desc' }, a.desc),
      un
        ? h('div', { class: 'badge-status done' }, t('achievements.unlockedOn', { date: new Date(s.achievements[a.id]).toLocaleDateString() }))
        : h(
            'div',
            { class: 'badge-status' },
            goal > 1 ? h('div', { class: 'progress-track' }, h('div', { class: 'progress-fill', style: { width: (Math.min(cur, goal) / goal) * 100 + '%' } })) : null,
            h('div', { class: 'mt-1' }, goal > 1 ? t('achievements.progress', { cur: fmt(cur), goal: fmt(goal) }) : t('achievements.locked')),
          ),
    ),
    buttons: [{ label: t('common.ok'), color: 'green' }],
  });
}

export default {
  render(root) {
    const bar = topBar({ title: t('achievements.title'), onBack: () => go('home') });
    const n = unlockedCount();
    const total = ACHIEVEMENTS.length;
    const fill = h('div', { class: 'progress-fill' });
    const summary = h(
      'div',
      { class: 'progress-card badge-summary' },
      h('div', { class: 'progress-text' }, t('achievements.count', { n, total })),
      h('div', { class: 'progress-track' }, fill),
    );
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = (n / total) * 100 + '%')));
    const grid = h(
      'div',
      { class: 'badge-grid' },
      ACHIEVEMENTS.map((a) => {
        const un = isUnlocked(a.id);
        return h(
          'button',
          { class: `badge-card ${un ? 'unlocked' : 'locked'}`, onclick: () => showBadge(a) },
          h('div', { class: 'badge-icon' }, a.icon),
          un ? null : h('div', { class: 'badge-lock' }, '🔒'),
          h('div', { class: 'badge-name' }, a.name),
        );
      }),
    );
    root.append(bar, h('div', { class: 'achievements' }, summary, grid));
    return () => bar.destroy();
  },
  onBack() {
    go('home');
    return true;
  },
};
