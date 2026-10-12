// Golden Stamp collection + teacher stats.
import { h, fmt, toast } from '../core/ui.js';
import { getState } from '../core/storage.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { STAMP_DESIGNS, isUnlocked, activeDesign, setActiveDesign } from '../core/stamps.js';
import { topBar } from './common.js';

export default {
  render(root) {
    const bar = topBar({ title: '🏅 Stamps & Stats', onBack: () => go('home') });
    const grid = h('div', { class: 'stamp-grid' });
    const s = getState();

    function draw() {
      const active = activeDesign();
      grid.replaceChildren(
        ...STAMP_DESIGNS.map((d) => {
          const un = isUnlocked(d.id);
          const card = h(
            'button',
            { class: `stamp-card ${un ? '' : 'locked'} ${active.id === d.id ? 'active' : ''}` },
            h('div', { class: 'stamp-preview', style: { color: d.color, borderColor: d.color } }, un ? d.icon : '🔒', h('span', { class: 'stamp-preview-grade' }, 'A+')),
            h('div', { class: 'stamp-name' }, un ? d.name : '???'),
            active.id === d.id ? h('div', { class: 'stamp-equipped' }, 'EQUIPPED') : null,
          );
          card.addEventListener('click', () => {
            if (!un) {
              sfx('wrong');
              toast('Unlock with ✨ Golden Stamp in Test Result levels!');
              return;
            }
            setActiveDesign(d.id);
            sfx('stamp');
            draw();
          });
          return card;
        }),
      );
    }
    draw();

    const st = s.stats;
    const totalStars = Object.values(s.stars).reduce((a, b) => a + b, 0);
    const stats = h(
      'div',
      { class: 'stats-card' },
      h('div', { class: 'stats-title' }, `👩‍🏫 ${s.teacherName}'s Record`),
      ...[
        ['⭐ Stars earned', totalStars],
        ['🎓 Lessons played', st.levelsPlayed],
        ['📝 Papers marked', st.papersMarked],
        ['🚨 Cheaters caught', st.cheatersCaught],
        ['🎒 Bags checked', st.bagsChecked],
        ['📚 Books sorted', st.booksSorted],
        ['🪙 Total coins earned', fmt(s.totalCoinsEarned)],
      ].map(([k, v]) => h('div', { class: 'stats-row' }, h('span', {}, k), h('b', {}, String(v)))),
    );

    root.append(bar, h('div', { class: 'collection' }, h('div', { class: 'section-title' }, 'Golden Stamp Designs'), grid, stats));
    return () => bar.destroy();
  },
  onBack() {
    go('home');
    return true;
  },
};
