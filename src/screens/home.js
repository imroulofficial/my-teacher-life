// Main menu.
import { h, btn, fmt } from '../core/ui.js';
import { getState } from '../core/storage.js';
import { go } from '../core/router.js';
import { incomePerHour, currentSize } from '../core/economy.js';
import { GAME_INFO, gameForLevel, levelLabel } from '../core/levels.js';
import { topBar } from './common.js';
import { APP } from '../core/config.js';
import { t, digits, currentLang } from '../i18n/index.js';

export default {
  render(root) {
    const s = getState();
    const level = s.unlockedLevel;
    const nextGame = GAME_INFO[gameForLevel(level)];
    const size = currentSize();
    const totalStars = Object.values(s.stars).reduce((a, b) => a + b, 0);
    const bar = topBar({ title: '' });

    const view = h(
      'div',
      { class: 'home' },
      bar,
      h('div', { class: 'clouds' }, h('span', { class: 'cloud c1' }, '☁️'), h('span', { class: 'cloud c2' }, '☁️'), h('span', { class: 'cloud c3' }, '☁️')),
      h(
        'div',
        { class: 'logo' },
        h('div', { class: 'logo-line1' }, 'My Teacher'),
        h('div', { class: 'logo-line2' }, 'Life', h('span', { class: 'logo-pen' }, '🖍️')),
        currentLang === 'bn' ? h('div', { class: 'logo-bn' }, t('appName')) : null,
      ),
      h('div', { class: 'home-school float-y' }, size.icon),
      h('div', { class: 'home-teacher bob' }, '👩‍🏫'),
      h(
        'div',
        { class: 'home-stats' },
        h('div', { class: 'stat-chip' }, `⭐ ${digits(totalStars)}`),
        h('div', { class: 'stat-chip' }, `🏫 ${size.name}`),
        h('div', { class: 'stat-chip' }, `💰 ${t('home.perHour', { n: fmt(incomePerHour()) })}`),
      ),
      h(
        'div',
        { class: 'home-play' },
        btn(t('home.play', { level: levelLabel(level) }), { color: 'green', size: 'xxl', icon: '▶', cls: 'play-btn pulse-soft', onClick: () => go('intro', { level }) }),
        h('div', { class: 'next-game' }, t('home.next', { icon: nextGame.icon, name: nextGame.name })),
      ),
      h(
        'div',
        { class: 'home-grid' },
        btn(t('home.levels'), { color: 'blue', icon: '🗺️', onClick: () => go('map', { level }) }),
        btn(t('home.school'), { color: 'orange', icon: '🏫', onClick: () => go('school') }),
        btn(t('home.stamps'), { color: 'purple', icon: '🏅', onClick: () => go('collection') }),
        btn(t('home.settings'), { color: 'gray', icon: '⚙️', onClick: () => go('settings') }),
      ),
      h('div', { class: 'studio' }, `${APP.studio} · v${APP.version}`),
    );
    root.appendChild(view);
    return () => bar.destroy();
  },
  onBack() {
    return false; // let the app exit
  },
};
