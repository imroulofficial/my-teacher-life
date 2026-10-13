// AdMob integration — Rewarded Video ONLY (no interstitials, no banners).
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, AdmobConsentStatus } from '@capacitor-community/admob';
import { ADS_TESTING, ADS_TEST_DEVICES } from './config.js';
import { adLoadingOverlay, toast, modal, h } from './ui.js';
import { getState, saveState } from './storage.js';

const isNative = () => Capacitor.isNativePlatform();

let initPromise = null;
let busy = false;

// Last known Google UMP consent info: { status, isConsentFormAvailable } or null if unknown.
let consentInfo = null;
// Only one consent request/form may run at a time.
let consentQueue = Promise.resolve();

function inConsentQueue(task) {
  const run = consentQueue.then(task, task);
  consentQueue = run.catch(() => {});
  return run;
}

/** Asks Google UMP for the current consent status. Never throws; returns null on failure. */
function refreshConsentInfo() {
  return inConsentQueue(async () => {
    try {
      consentInfo = await AdMob.requestConsentInfo();
    } catch (e) {
      // e.g. no consent message configured in AdMob yet, or the device is offline
      console.warn('Consent info unavailable', e);
    }
    return consentInfo;
  });
}

/** Shows the UMP consent form. Never throws; returns true if it was shown. */
function showConsentFormSafe() {
  return inConsentQueue(async () => {
    try {
      const after = await AdMob.showConsentForm();
      if (after && after.status) consentInfo = { ...consentInfo, ...after };
      return true;
    } catch (e) {
      console.warn('Consent form could not be shown', e);
      return false;
    }
  });
}

/**
 * Starts ads once on app start (App ID lives in AndroidManifest.xml).
 * Sequence: 1) request consent info  2) show the consent form if Google says it's required
 *           3) initialize AdMob. Ads are only requested after this has finished.
 */
export function initAds() {
  if (!isNative()) return Promise.resolve();
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit() {
  const info = await refreshConsentInfo();
  if (info && info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
    await showConsentFormSafe();
  }
  try {
    await AdMob.initialize({
      initializeForTesting: ADS_TESTING,
      testingDevices: ADS_TEST_DEVICES,
    });
  } catch (e) {
    console.warn('AdMob init failed', e);
    initPromise = null; // allow a retry later (e.g. when the network returns)
  }
}

/**
 * True when a privacy-options (consent) form exists for this player, i.e. Google says consent
 * applies to them (EEA/UK) and a form is configured in AdMob. Used to show/hide the Settings entry.
 */
export async function privacyOptionsAvailable() {
  if (!isNative()) return false;
  await initAds();
  const info = consentInfo || (await refreshConsentInfo());
  return !!(info && info.isConsentFormAvailable && info.status !== AdmobConsentStatus.NOT_REQUIRED);
}

/** Lets the player review/change their ad privacy choices from Settings. Never shows raw errors. */
export async function showPrivacyOptions() {
  if (!isNative()) {
    toast('Ad privacy choices are available in the Android app.');
    return;
  }
  await initAds();
  const info = await refreshConsentInfo();
  if (!info) {
    toast('Ad privacy choices are not available right now. Please check your internet connection and try again later.');
    return;
  }
  if (info.status === AdmobConsentStatus.NOT_REQUIRED || !info.isConsentFormAvailable) {
    toast('No ad privacy choices are needed in your region.');
    return;
  }
  const shown = await showConsentFormSafe();
  if (shown) toast('Your ad privacy choices are saved.', 'success');
  else toast('Ad privacy choices are not available right now. Please try again later.');
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
