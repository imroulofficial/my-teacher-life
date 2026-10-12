// Shared screen pieces: top bar with coins.
import { h, fmt } from '../core/ui.js';
import { getState } from '../core/storage.js';
import { isBoostActive, boostRemainingMs } from '../core/economy.js';
import { sfx } from '../core/audio.js';

export function topBar({ title, onBack } = {}) {
  const coinText = h('span', {}, fmt(getState().coins));
  const boost = h('div', { class: 'boost-pill hidden' });
  const bar = h(
    'div',
    { class: 'top-bar' },
    onBack
      ? h(
          'button',
          {
            class: 'hud-icon-btn',
            'aria-label': 'Back',
            onclick: () => {
              sfx('tap');
              onBack();
            },
          },
          '←',
        )
      : h('div', { class: 'w-11' }),
    h('div', { class: 'top-title' }, title || ''),
    h('div', { class: 'flex items-center gap-2' }, boost, h('div', { class: 'coin-pill' }, h('span', { class: 'coin-icon' }, '🪙'), coinText)),
  );
  const update = () => {
    coinText.textContent = fmt(getState().coins);
    const on = isBoostActive();
    boost.classList.toggle('hidden', !on);
    if (on) boost.textContent = `✨x2 ${Math.ceil(boostRemainingMs() / 60000)}m`;
  };
  update();
  window.addEventListener('mtl:coins', update);
  const iv = setInterval(update, 5000);
  bar.destroy = () => {
    window.removeEventListener('mtl:coins', update);
    clearInterval(iv);
  };
  return bar;
}
