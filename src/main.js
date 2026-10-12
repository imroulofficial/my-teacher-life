// My Teacher Life — app entry point.
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/patrick-hand/400.css';
import './style.css';

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { loadState } from './core/storage.js';
import { initAds, showRewardedAd } from './core/ads.js';
import { AD_UNITS } from './core/config.js';
import { unlockAudioOnFirstTouch, sfx } from './core/audio.js';
import { h, modal, toast, fmt, fmtDuration, confetti, closeTopModal } from './core/ui.js';
import { computeOfflineEarnings, touchLastSeen, addCoins } from './core/economy.js';
import { registerScreen, go, handleBack } from './core/router.js';

import home from './screens/home.js';
import map from './screens/map.js';
import intro from './screens/intro.js';
import game from './screens/game.js';
import school from './screens/school.js';
import collection from './screens/collection.js';
import settings from './screens/settings.js';

registerScreen('home', home);
registerScreen('map', map);
registerScreen('intro', intro);
registerScreen('game', game);
registerScreen('school', school);
registerScreen('collection', collection);
registerScreen('settings', settings);

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
    toast(`🏫 Your school earned ${fmt(r.coins)} 🪙 while you were away`, 'success', 2600);
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
    title: '🌙 Welcome back!',
    dismissable: false,
    body: h(
      'div',
      { class: 'text-center' },
      h('div', { class: 'text-6xl my-2 float-y' }, '🏫'),
      h('p', { class: 'text-lg' }, `You were away for ${fmtDuration(r.awayMs)}.`),
      r.capped ? h('p', { class: 'text-sm opacity-70' }, '(Earnings are capped at 12 hours — come back sooner for more!)') : null,
      h('p', { class: 'mt-2' }, 'Your school earned:'),
      h('div', { class: 'grant-amount' }, `${fmt(r.coins)} 🪙`),
      h('p', { class: 'mt-1 font-bold text-amber-600' }, `Watch a video to get x${mult} = ${fmt(r.coins * mult)} 🪙`),
    ),
    buttons: [
      {
        label: 'Collect',
        color: 'gray',
        onClick: () => {
          collect(r.coins);
          offlineModalOpen = false;
        },
      },
      {
        label: `x${mult} Coins`,
        color: 'gold',
        icon: '📺',
        onClick: () => {
          showRewardedAd(AD_UNITS.OFFLINE_DOUBLE, () => {
            collect(r.coins * mult);
            confetti(90);
            toast(`💰 x${mult}! +${fmt(r.coins * mult)} coins`, 'success', 2600);
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

async function boot() {
  loadState();
  unlockAudioOnFirstTouch();
  setupLifecycle();
  go('home');
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 400);
  }
  checkOfflineEarnings();
  // Ads initialize in the background; the game never waits for the network.
  initAds();
}

boot();
