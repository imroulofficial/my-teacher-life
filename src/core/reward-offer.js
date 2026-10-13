// Opt-in "Double Your Reward" panel shown on the level-complete screen.
// The player must tap "Watch & Double" themselves; "No thanks" and the normal
// level buttons always work, and nothing ever plays automatically.
import { h, btn, toast, fmt } from './ui.js';
import { sfx } from './audio.js';
import { AD_UNITS } from './config.js';
import { showRewardedAdDetailed } from './ads.js';
import { addCoins } from './economy.js';
import { t } from '../i18n/index.js';

const usedKey = (level) => `reward_offered_level_${level}`;

function alreadyUsed(level) {
  try {
    return localStorage.getItem(usedKey(level)) === '1';
  } catch (e) {
    return false;
  }
}

function markUsed(level) {
  try {
    localStorage.setItem(usedKey(level), '1');
  } catch (e) {
    /* storage unavailable: the offer simply stays available */
  }
}

/**
 * Builds the reward panel, or returns null when the offer was already used for this level.
 * @param {{ level: number, coins: number, coinsEl?: HTMLElement }} opts
 *   coins   — coins won in this level (the bonus doubles them)
 *   coinsEl — the "+N 🪙" element on the result card, updated after the bonus
 */
export function rewardOfferPanel({ level, coins, coinsEl }) {
  if (!coins || coins <= 0 || alreadyUsed(level)) return null;

  let loading = false;
  const watchBtn = btn(t('reward.watch'), {
    color: 'green',
    size: 'md',
    icon: '▶',
    cls: 'reward-offer-watch',
    onClick: watch,
  });
  const noBtn = btn(t('reward.no'), { color: 'gray', size: 'sm', cls: 'reward-offer-no', onClick: () => close() });

  const panel = h(
    'div',
    { class: 'reward-offer pop-in' },
    h('div', { class: 'reward-offer-title' }, t('reward.title')),
    h('div', { class: 'reward-offer-desc' }, t('reward.desc', { coins: fmt(coins) })),
    h('div', { class: 'reward-offer-buttons' }, watchBtn, noBtn),
  );

  function close() {
    if (!panel.isConnected) return;
    panel.classList.add('reward-offer-out');
    setTimeout(() => panel.remove(), 200);
  }

  async function watch() {
    if (loading) return; // never start two ad requests at once
    loading = true;
    watchBtn.disabled = true;
    noBtn.disabled = true;
    let result = { earned: false, failed: true };
    try {
      result = await showRewardedAdDetailed(
        AD_UNITS.OFFLINE_DOUBLE,
        () => {
          addCoins(coins);
          markUsed(level);
          if (coinsEl) coinsEl.textContent = `+${fmt(coins * 2)} 🪙`;
          if (coinsEl) coinsEl.classList.add('result-coins-doubled');
          sfx('coin');
          toast(t('reward.received'), 'success');
        },
        { quiet: true },
      );
    } catch (e) {
      console.warn('Reward offer failed', e);
    }
    if (result.busy) {
      // another video was already loading: keep the offer available
      loading = false;
      watchBtn.disabled = false;
      noBtn.disabled = false;
      return;
    }
    if (!result.earned && result.failed) toast(t('reward.unavailable'));
    // Watched, closed early or unavailable: the offer is done for this level completion.
    close();
  }

  return panel;
}
