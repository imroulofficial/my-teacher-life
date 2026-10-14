// Settings: sound, vibration, teacher name, privacy, reset.
import { h, btn, toast, confirmModal } from '../core/ui.js';
import { getState, saveState, resetState } from '../core/storage.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { showPrivacyOptions, privacyOptionsAvailable } from '../core/ads.js';
import { APP } from '../core/config.js';
import { topBar } from './common.js';
import { ENGAGEMENT_KEYS } from '../core/engagement.js';
import { t, currentLang, setLanguage, LANGUAGES } from '../i18n/index.js';

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
    const bar = topBar({ title: t('settings.title'), onBack: () => go('home') });
    const nameInput = h('input', { class: 'name-input', maxlength: 16, value: s.teacherName === 'Teacher' ? t('settings.defaultName') : s.teacherName });
    nameInput.addEventListener('change', () => {
      s.teacherName = nameInput.value.trim().slice(0, 16) || 'Teacher';
      nameInput.value = s.teacherName;
      saveState();
      toast(t('settings.nameSaved'), 'success');
    });

    // Only shown when Google's consent form applies to this player (EEA/UK) and is configured in AdMob.
    const privacyRow = h(
      'div',
      { class: 'setting-row hidden' },
      h('span', {}, t('settings.privacy')),
      btn(t('settings.open'), { color: 'blue', size: 'sm', onClick: () => showPrivacyOptions() }),
    );
    privacyOptionsAvailable()
      .then((ok) => privacyRow.classList.toggle('hidden', !ok))
      .catch(() => {});

    // Language switcher (also chosen on first launch). The screen redraws in the new language.
    const languageRow = h(
      'div',
      { class: 'setting-row' },
      h('span', {}, t('language.setting')),
      h(
        'div',
        { class: 'lang-switch' },
        LANGUAGES.map((l) => {
          const b = h('button', { class: `lang-switch-btn ${currentLang === l.id ? 'on' : ''}`, lang: l.id }, l.label);
          b.addEventListener('click', () => {
            if (currentLang === l.id) return;
            sfx('tap');
            setLanguage(l.id);
            toast(t('language.changed'), 'success');
          });
          return b;
        }),
      ),
    );

    const panel = h(
      'div',
      { class: 'settings' },
      languageRow,
      h('div', { class: 'setting-row' }, h('span', {}, t('settings.name')), nameInput),
      toggle(t('settings.sound'), 'sound'),
      toggle(t('settings.vibration'), 'vibration'),
      privacyRow,
      h(
        'div',
        { class: 'setting-row' },
        h('span', {}, t('settings.reset')),
        btn(t('settings.resetBtn'), {
          color: 'red',
          size: 'sm',
          onClick: async () => {
            const ok = await confirmModal(t('settings.resetTitle'), t('settings.resetText'), t('settings.resetBtn'));
            if (ok) {
              resetState();
              try {
                ENGAGEMENT_KEYS.forEach((k) => localStorage.removeItem(k));
              } catch (e) {
                /* ignore */
              }
              toast(t('settings.resetDone'), 'success');
              go('home');
            }
          },
        }),
      ),
      h(
        'div',
        { class: 'about' },
        h('div', { class: 'text-4xl' }, '🖍️'),
        h('div', { class: 'font-bold text-xl' }, t('appName')),
        h('div', {}, t('settings.version', { v: APP.version })),
        h('div', { class: 'opacity-70' }, t('settings.madeBy', { studio: APP.studio })),
        h('div', { class: 'opacity-70 text-sm mt-2' }, t('settings.offlineNote')),
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
