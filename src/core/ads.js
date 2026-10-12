// AdMob integration — Rewarded Video ONLY (no interstitials, no banners).
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, AdmobConsentStatus } from '@capacitor-community/admob';
import { ADS_TESTING, ADS_TEST_DEVICES } from './config.js';
import { adLoadingOverlay, toast, modal, h } from './ui.js';
import { getState, saveState } from './storage.js';

const isNative = () => Capacitor.isNativePlatform();

let initPromise = null;
let busy = false;

/** Initialize AdMob once on app start (App ID lives in AndroidManifest.xml). */
export function initAds() {
  if (!isNative()) return Promise.resolve();
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit() {
  try {
    await AdMob.initialize({
      initializeForTesting: ADS_TESTING,
      testingDevices: ADS_TEST_DEVICES,
    });
  } catch (e) {
    console.warn('AdMob init failed', e);
    initPromise = null; // allow a retry later (e.g. when the network returns)
    return;
  }
  // Google UMP consent (required for EEA/UK users). Silently skipped elsewhere.
  try {
    const info = await AdMob.requestConsentInfo();
    if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
      await AdMob.showConsentForm();
    }
  } catch (e) {
    console.warn('Consent flow skipped', e);
  }
}

/** Lets the player re-open the privacy/consent form from Settings. */
export async function showPrivacyOptions() {
  if (!isNative()) {
    toast('Privacy options are available in the Android app.');
    return;
  }
  try {
    await AdMob.resetConsentInfo();
    const info = await AdMob.requestConsentInfo();
    if (info.isConsentFormAvailable) await AdMob.showConsentForm();
    else toast('No privacy form is required in your region.');
  } catch (e) {
    toast('Privacy options unavailable right now.', 'error');
  }
}

function emit(name) {
  window.dispatchEvent(new CustomEvent(name));
}

/**
 * Shows a rewarded video ad. `onRewardEarned` runs ONLY if the player
 * watched the video to the end and earned the reward.
 *
 * @param {string} adUnitId  AdMob rewarded ad unit id
 * @param {(reward:{type:string, amount:number}) => void} onRewardEarned
 * @returns {Promise<boolean>} true if the reward was earned
 */
export async function showRewardedAd(adUnitId, onRewardEarned) {
  if (busy) return false;
  busy = true;
  emit('mtl:ad-open');
  let earned = false;
  let reward = null;
  try {
    if (isNative()) {
      ({ earned, reward } = await showNative(adUnitId));
    } else {
      ({ earned, reward } = await showWebSimulation(adUnitId));
    }
  } catch (e) {
    console.warn('Rewarded ad error', e);
    earned = false;
  } finally {
    adLoadingOverlay(false);
    busy = false;
    emit('mtl:ad-close');
  }
  if (earned) {
    const s = getState();
    s.stats.adsWatched++;
    saveState();
    try {
      onRewardEarned && onRewardEarned(reward || { type: 'reward', amount: 1 });
    } catch (e) {
      console.error('Reward handler failed', e);
    }
  }
  return earned;
}

async function showNative(adUnitId) {
  await initAds();
  const handles = [];
  let earned = false;
  let reward = null;

  const result = await new Promise((resolve) => {
    let settled = false;
    const settle = (delay = 0) => {
      if (settled) return;
      settled = true;
      // Short delay so a late "Rewarded" event still counts.
      setTimeout(() => resolve(), delay);
    };
    const add = async (evt, fn) => handles.push(await AdMob.addListener(evt, fn));

    (async () => {
      await add(RewardAdPluginEvents.Rewarded, (item) => {
        earned = true;
        reward = item;
      });
      await add(RewardAdPluginEvents.Dismissed, () => settle(400));
      await add(RewardAdPluginEvents.FailedToShow, () => {
        toast('The video could not play. Please try again.', 'error');
        settle();
      });

      adLoadingOverlay(true);
      const loadTimeout = setTimeout(() => {
        toast('No video available right now. Check your internet connection.', 'error', 2600);
        settle();
      }, 15000);
      try {
        await AdMob.prepareRewardVideoAd({ adId: adUnitId, isTesting: ADS_TESTING });
      } catch (e) {
        clearTimeout(loadTimeout);
        toast('No video available right now. Check your internet connection.', 'error', 2600);
        settle();
        return;
      }
      clearTimeout(loadTimeout);
      if (settled) return; // timed out while loading
      adLoadingOverlay(false);
      try {
        const item = await AdMob.showRewardVideoAd();
        if (item && typeof item.amount === 'number') {
          earned = true;
          reward = item;
        }
      } catch (e) {
        settle();
      }
    })();
  });

  for (const hd of handles) {
    try {
      await hd.remove();
    } catch (e) {
      /* ignore */
    }
  }
  return { earned, reward, result };
}

/** In a desktop browser (development) we simulate a 3-second reward video. */
function showWebSimulation(adUnitId) {
  return new Promise((resolve) => {
    let seconds = 3;
    let done = false;
    const counter = h('div', { class: 'text-5xl font-bold text-center my-4' }, String(seconds));
    const m = modal({
      title: '📺 Reward Video (preview)',
      dismissable: false,
      body: h(
        'div',
        { class: 'text-center' },
        h('p', { class: 'opacity-80' }, 'Real ads only play inside the Android app.'),
        counter,
        h('p', { class: 'text-xs opacity-60 break-all' }, adUnitId),
      ),
      buttons: [
        {
          label: 'Skip (no reward)',
          color: 'gray',
          onClick: () => {
            done = true;
            clearInterval(iv);
            resolve({ earned: false });
          },
        },
      ],
    });
    const iv = setInterval(() => {
      seconds--;
      counter.textContent = String(Math.max(seconds, 0));
      if (seconds <= 0 && !done) {
        done = true;
        clearInterval(iv);
        m.close();
        resolve({ earned: true, reward: { type: 'coins', amount: 1 } });
      }
    }, 1000);
  });
}

// Exposed globally as requested: window.showRewardedAd(adUnitId, onRewardEarned)
window.showRewardedAd = showRewardedAd;
