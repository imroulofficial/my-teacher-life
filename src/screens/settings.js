// Settings: sound, vibration, teacher name, privacy, legal links, reset, about.
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { h, btn, toast, confirmModal, modal } from '../core/ui.js';
import { getState, saveState, resetState } from '../core/storage.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { showPrivacyOptions, privacyOptionsAvailable } from '../core/ads.js';
import { APP } from '../core/config.js';
import { topBar } from './common.js';
import { ENGAGEMENT_KEYS } from '../core/engagement.js';
import { currentTheme, applyTheme } from '../core/themes.js';
import { t, digits, currentLang, setLanguage, LANGUAGES } from '../i18n/index.js';

// Public pages (GitHub Pages) and support address.
const PRIVACY_URL = 'https://imroulofficial.github.io/my-teacher-life/privacy-policy.html';
const TERMS_URL = 'https://imroulofficial.github.io/my-teacher-life/terms.html';
const SUPPORT_EMAIL = 'mdimroulhassanofficial@gmail.com';

/** Opens a web page in the device's browser (Custom Tab on Android); falls back to window.open. */
async function openLink(url) {
  if (navigator.onLine === false) toast(t('settings.needsInternet'));
  try {
    await Browser.open({ url });
  } catch (e) {
    if (!window.open(url, '_blank', 'noopener')) window.location.href = url;
  }
}

/** Opens the email app with a pre-filled subject (Capacitor hands mailto: links to Android). */
function openSupportEmail() {
  window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('My Teacher Life - Support')}`;
}

/** Settings row that acts like a link: label on the left, chevron on the right. */
function linkRow(label, onClick) {
  return h(
    'button',
    {
      class: 'setting-row link-row',
      onclick: () => {
        sfx('tap');
        onClick();
      },
    },
    h('span', {}, label),
    h('span', { class: 'link-chevron', 'aria-hidden': 'true' }, '›'),
  );
}

/** Installed version on a phone (Android versionName); the web build falls back to config. */
async function appVersion() {
  try {
    return (await App.getInfo()).version || APP.version;
  } catch (e) {
    return APP.version;
  }
}

async function showAbout() {
  const version = await appVersion();
  modal({
    title: t('settings.aboutTitle'),
    cls: 'about-modal',
    body: h(
      'div',
      { class: 'about' },
      h('img', { class: 'about-logo', src: './logo.svg', alt: '', width: 128, height: 128 }),
      h('div', { class: 'font-bold text-xl' }, APP.name),
      h('div', {}, t('settings.version', { v: digits(version) })),
      h('div', { class: 'about-line' }, t('settings.developer', { studio: APP.studio })),
      h('div', { class: 'about-line' }, t('settings.madeIn')),
      h('a', { class: 'about-mail', href: `mailto:${SUPPORT_EMAIL}` }, SUPPORT_EMAIL),
      h('div', { class: 'opacity-70 text-sm mt-2' }, t('settings.offlineNote')),
      h('div', { class: 'about-copy' }, t('settings.rights', { studio: APP.studio })),
    ),
    buttons: [{ label: t('common.ok'), color: 'green' }],
  });
}

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
      h(
        'div',
        { class: 'setting-row' },
        h('span', { class: 'theme-row-label' }, t('themes.setting'), h('span', { class: 'theme-row-name' }, `${currentTheme().icon} ${currentTheme().name}`)),
        btn(t('themes.change'), { color: 'purple', size: 'sm', icon: '🎨', cls: 'theme-row-btn', onClick: () => go('themes') }),
      ),
      toggle(t('settings.sound'), 'sound'),
      toggle(t('settings.vibration'), 'vibration'),
      privacyRow,
      linkRow(t('settings.privacyPolicy'), () => openLink(PRIVACY_URL)),
      linkRow(t('settings.terms'), () => openLink(TERMS_URL)),
      linkRow(t('settings.contact'), openSupportEmail),
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
              applyTheme();
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
      linkRow(t('settings.about'), showAbout),
    );
    root.append(bar, panel);
    return () => bar.destroy();
  },
  onBack() {
    go('home');
    return true;
  },
};
