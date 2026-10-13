// Settings: sound, vibration, teacher name, privacy, reset.
import { h, btn, toast, confirmModal } from '../core/ui.js';
import { getState, saveState, resetState } from '../core/storage.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { showPrivacyOptions, privacyOptionsAvailable } from '../core/ads.js';
import { APP } from '../core/config.js';
import { topBar } from './common.js';

function toggle(label, key) {
  const s = getState();
  const sw = h('button', { class: `switch ${s.settings[key] ? 'on' : ''}`, 'aria-label': label }, h('span', { class: 'knob' }));
  sw.addEventListener('click', () => {
    s.settings[key] = !s.settings[key];
    saveState();
    sw.classList.toggle('on', s.settings[key]);
    sfx('tap');
  });
  return h('div', { class: 'setting-row' }, h('span', {}, label), sw);
}

export default {
  render(root) {
    const s = getState();
    const bar = topBar({ title: '⚙️ Settings', onBack: () => go('home') });
    const nameInput = h('input', { class: 'name-input', maxlength: 16, value: s.teacherName });
    nameInput.addEventListener('change', () => {
      s.teacherName = nameInput.value.trim().slice(0, 16) || 'Teacher';
      nameInput.value = s.teacherName;
      saveState();
      toast('Name saved!', 'success');
    });

    // Only shown when Google's consent form applies to this player (EEA/UK) and is configured in AdMob.
    const privacyRow = h(
      'div',
      { class: 'setting-row hidden' },
      h('span', {}, '🔒 Ad privacy choices'),
      btn('Open', { color: 'blue', size: 'sm', onClick: () => showPrivacyOptions() }),
    );
    privacyOptionsAvailable()
      .then((ok) => privacyRow.classList.toggle('hidden', !ok))
      .catch(() => {});

    const panel = h(
      'div',
      { class: 'settings' },
      h('div', { class: 'setting-row' }, h('span', {}, '👩‍🏫 Teacher name'), nameInput),
      toggle('🔊 Sound effects', 'sound'),
      toggle('📳 Vibration', 'vibration'),
      privacyRow,
      h(
        'div',
        { class: 'setting-row' },
        h('span', {}, '🗑️ Reset all progress'),
        btn('Reset', {
          color: 'red',
          size: 'sm',
          onClick: async () => {
            const ok = await confirmModal('Reset progress?', 'All levels, coins and school upgrades will be erased. This cannot be undone.', 'Reset');
            if (ok) {
              resetState();
              toast('Progress reset.', 'success');
              go('home');
            }
          },
        }),
      ),
      h(
        'div',
        { class: 'about' },
        h('div', { class: 'text-4xl' }, '🖍️'),
        h('div', { class: 'font-bold text-xl' }, APP.name),
        h('div', {}, `Version ${APP.version}`),
        h('div', { class: 'opacity-70' }, `Made with ❤️ by ${APP.studio}`),
        h('div', { class: 'opacity-70 text-sm mt-2' }, 'Plays fully offline. Optional reward videos need an internet connection.'),
      ),
    );
    root.append(bar, panel);
    return () => bar.destroy();
  },
  onBack() {
    go('home');
    return true;
  },
};
