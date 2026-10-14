// My Teacher Life — app entry point.
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/patrick-hand/400.css';
import '@fontsource/baloo-da-2/bengali-500.css';
import '@fontsource/baloo-da-2/bengali-600.css';
import '@fontsource/baloo-da-2/bengali-700.css';
import '@fontsource/galada/bengali-400.css';
import './style.css';

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { loadState } from './core/storage.js';
import { initAds, showRewardedAd } from './core/ads.js';
import { AD_UNITS } from './core/config.js';
import { unlockAudioOnFirstTouch, sfx } from './core/audio.js';
import { h, modal, toast, fmt, fmtDuration, confetti, closeTopModal } from './core/ui.js';
import { computeOfflineEarnings, touchLastSeen, addCoins } from './core/economy.js';
import { initEngagement } from './core/engagement.js';
import { checkAchievements } from './core/achievements.js';
import { applyTheme } from './core/themes.js';
import { initChapterIntros } from './screens/chapter-intro.js';
import { registerScreen, go, handleBack, refresh, currentScreen } from './core/router.js';
import { t, setLanguage, hasChosenLanguage, onLanguageChange, LANGUAGES } from './i18n/index.js';

import home from './screens/home.js';
import map from './screens/map.js';
import intro from './screens/intro.js';
import game from './screens/game.js';
import school from './screens/school.js';
import collection from './screens/collection.js';
import settings from './screens/settings.js';
import achievements from './screens/achievements.js';
import themes from './screens/themes.js';

registerScreen('home', home);
registerScreen('map', map);
registerScreen('intro', intro);
registerScreen('game', game);
registerScreen('school', school);
registerScreen('collection', collection);
registerScreen('settings', settings);
registerScreen('achievements', achievements);
registerScreen('themes', themes);

// ---------------------------------------------------------------------------
// Offline earnings (rewarded_offline_double)
// ---------------------------------------------------------------------------
let offlineModalOpen = false;

function checkOfflineEarnings() {
  if (offlineModalOpen) return;
  const r = computeOfflineEarnings();
  touchLastSeen();
  if (!r) return;

  if (!r.canAd) {
    // Short break: just collect quietly.
    addCoins(r.coins);
    toast(t('offline.quick', { coins: fmt(r.coins) }), 'success', 2600);
    return;
  }

  offlineModalOpen = true;
  const mult = r.adMultiplier;
  let collected = false;
  const collect = (amount) => {
    if (collected) return;
    collected = true;
    addCoins(amount);
    sfx('coin');
  };
  const m = modal({
    title: t('offline.title'),
    dismissable: false,
    body: h(
      'div',
      { class: 'text-center' },
      h('div', { class: 'text-6xl my-2 float-y' }, '🏫'),
      h('p', { class: 'text-lg' }, t('offline.away', { time: fmtDuration(r.awayMs) })),
      r.capped ? h('p', { class: 'text-sm opacity-70' }, t('offline.capped')) : null,
      h('p', { class: 'mt-2' }, t('offline.earned')),
      h('div', { class: 'grant-amount' }, `${fmt(r.coins)} 🪙`),
      h('p', { class: 'mt-1 font-bold text-amber-600' }, t('offline.watchOffer', { mult, coins: fmt(r.coins * mult) })),
    ),
    buttons: [
      {
        label: t('offline.collect'),
        color: 'gray',
        onClick: () => {
          collect(r.coins);
          offlineModalOpen = false;
        },
      },
      {
        label: t('offline.multCoins', { mult }),
        color: 'gold',
        icon: '📺',
        onClick: () => {
          showRewardedAd(AD_UNITS.OFFLINE_DOUBLE, () => {
            collect(r.coins * mult);
            confetti(90);
            toast(t('offline.gotMult', { mult, coins: fmt(r.coins * mult) }), 'success', 2600);
          }).then((earned) => {
            if (!earned) {
              // Ad not available/skipped: keep the dialog so the player can still collect.
              return;
            }
            offlineModalOpen = false;
            m.close();
          });
          return true; // keep dialog open until the ad finishes
        },
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
function setupLifecycle() {
  // Keep "last seen" fresh while the game is open so play time isn't counted as offline.
  setInterval(touchLastSeen, 15000);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) touchLastSeen();
    else checkOfflineEarnings();
  });
  window.addEventListener('pagehide', touchLastSeen);

  if (Capacitor.isNativePlatform()) {
    App.addListener('backButton', () => {
      if (closeTopModal()) return;
      if (handleBack()) return;
      App.exitApp();
    });
  } else {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!closeTopModal()) handleBack();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Language: first-launch picker; re-render the current screen when it changes
// ---------------------------------------------------------------------------
function showLanguagePicker() {
  return new Promise((resolve) => {
    const choose = (lang) => {
      setLanguage(lang);
      sfx('tap');
      picker.close();
      resolve(lang);
    };
    const picker = modal({
      title: '🌐 ভাষা / Language',
      dismissable: false,
      cls: 'lang-picker',
      body: h(
        'div',
        { class: 'text-center' },
        h('div', { class: 'lang-picker-icon' }, '👩‍🏫'),
        h('p', { class: 'lang-picker-line', lang: 'bn' }, 'ভাষা নির্বাচন করুন'),
        h('p', { class: 'lang-picker-line', lang: 'en' }, 'Choose your language'),
        h(
          'div',
          { class: 'lang-picker-buttons' },
          LANGUAGES.map((l) => {
            const b = h('button', { class: `btn3d btn-lg ${l.id === 'bn' ? 'btn-green' : 'btn-blue'} lang-choice`, lang: l.id }, h('span', { class: 'btn-label' }, l.label));
            b.addEventListener('click', () => choose(l.id));
            return b;
          }),
        ),
      ),
    });
  });
}

onLanguageChange(() => {
  // A level in progress keeps going; every other screen redraws in the new language.
  if (currentScreen() !== 'game') refresh();
});

async function boot() {
  loadState();
  applyTheme();
  initChapterIntros();
  initEngagement();
  checkAchievements({ quiet: true }); // badges already earned before this version
  unlockAudioOnFirstTouch();
  setupLifecycle();
  go('home');
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 400);
  }
  if (!hasChosenLanguage()) await showLanguagePicker();
  checkOfflineEarnings();
  // Ads initialize in the background; the game never waits for the network.
  initAds();
}

boot();
