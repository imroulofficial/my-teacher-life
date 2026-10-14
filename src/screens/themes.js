// Theme picker: preview any unlocked classroom theme, then apply it.
import { h, btn, toast } from '../core/ui.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { THEMES, currentTheme, isThemeUnlocked, setTheme } from '../core/themes.js';
import { topBar } from './common.js';
import { t } from '../i18n/index.js';

/** A small classroom drawn with the theme's own colours (scoped by data-theme). */
function preview(th) {
  return h(
    'div',
    { class: 'theme-preview', 'data-theme': th.id },
    h('div', { class: 'theme-preview-sky' }, h('span', { class: 'theme-preview-icon' }, th.icon)),
    h(
      'div',
      { class: 'theme-preview-room' },
      h('div', { class: 'chalkboard theme-preview-board' }, h('div', { class: 'chalk-text' }, t('themes.boardText'))),
      h(
        'div',
        { class: 'theme-preview-kids' },
        th.shirts.slice(0, 4).map((c, i) =>
          h(
            'div',
            { class: 'theme-preview-kid' },
            h('div', { class: 'student-face' }, ['🧒', '👧🏽', '👦🏻', '👧🏾'][i]),
            h('div', { class: 'student-body small', style: { background: c } }),
            h('div', { class: 'desk' }),
          ),
        ),
      ),
    ),
  );
}

export default {
  render(root) {
    const bar = topBar({ title: t('themes.title'), onBack: () => go('settings') });
    let selected = currentTheme();
    const previewWrap = h('div', { class: 'theme-preview-wrap' });
    const title = h('div', { class: 'theme-selected-name' });
    const applyBtn = btn(t('themes.apply'), {
      color: 'green',
      size: 'lg',
      icon: '🎨',
      onClick: () => {
        if (setTheme(selected.id)) {
          sfx('star');
          toast(t('themes.applied', { name: selected.name }), 'success');
          draw();
        }
      },
    });
    const list = h('div', { class: 'theme-list' });

    function draw() {
      const inUse = currentTheme();
      previewWrap.replaceChildren(preview(selected));
      title.textContent = `${selected.icon} ${selected.name}`;
      applyBtn.disabled = selected.id === inUse.id;
      applyBtn.querySelector('.btn-label').textContent = selected.id === inUse.id ? t('themes.inUse') : t('themes.apply');
      list.replaceChildren(
        ...THEMES.map((th) => {
          const un = isThemeUnlocked(th);
          const card = h(
            'button',
            { class: `theme-card ${un ? '' : 'locked'} ${th.id === selected.id ? 'selected' : ''}`, 'data-theme': th.id },
            h('div', { class: 'theme-swatch' }, h('span', {}, un ? th.icon : '🔒')),
            h(
              'div',
              { class: 'theme-card-text' },
              h('div', { class: 'theme-card-name' }, th.name),
              h('div', { class: 'theme-card-desc' }, un ? th.desc : t('themes.unlockAt', { n: th.unlockAt })),
            ),
            th.id === inUse.id ? h('div', { class: 'theme-card-tag' }, '✔') : null,
          );
          card.addEventListener('click', () => {
            if (!un) {
              sfx('wrong');
              toast(t('themes.unlockAt', { n: th.unlockAt }));
              return;
            }
            sfx('tap');
            selected = th;
            draw();
          });
          return card;
        }),
      );
    }
    draw();

    root.append(bar, h('div', { class: 'themes' }, previewWrap, title, applyBtn, list));
    return () => bar.destroy();
  },
  onBack() {
    go('settings');
    return true;
  },
};
