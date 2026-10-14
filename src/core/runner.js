// Runs one level of a mini-game: HUD, pause, game clock, power-ups and results.
import { h, btn, modal, toast, confetti, floatAtEl, flashMark, fmt, clearChildren } from './ui.js';
import { sfx, vibrate } from './audio.js';
import { getState, saveState } from './storage.js';
import { showRewardedAd } from './ads.js';
import { GAME_INFO, gameForLevel, difficultyFor, roundsFor, baseCoinsFor, levelLabel, chapterOf } from './levels.js';
import { addCoins, levelCoinMultiplier, isBoostActive, boostRemainingMs } from './economy.js';
import { GAMES } from '../mini-games/index.js';
import { rewardOfferPanel } from './reward-offer.js';
import { recordLevelPlayed, nearMiss } from './engagement.js';
import { t, digits } from '../i18n/index.js';
import { go } from './router.js';
import { MAX_STORY_LEVEL } from './config.js';

export function starsFor(acc) {
  if (acc >= 0.9) return 3;
  if (acc >= 0.7) return 2;
  if (acc >= 0.5) return 1;
  return 0;
}

/**
 * Renders the game screen for `level` into `root`.
 * Returns a cleanup function.
 */
export function runLevel(root, level) {
  const gameId = gameForLevel(level);
  const game = GAMES[gameId];
  const info = GAME_INFO[gameId];
  const difficulty = difficultyFor(level, gameId);
  const rounds = roundsFor(level, gameId);

  // ---------------------------------------------------------------- layout
  const pauseBtn = h('button', { class: 'hud-icon-btn', 'aria-label': 'Pause' }, '⏸');
  const progressFill = h('div', { class: 'hud-progress-fill' });
  const progressText = h('div', { class: 'hud-progress-text' }, `0 / ${rounds}`);
  const scoreEl = h('div', { class: 'hud-score' }, '✔ 0');
  const boostEl = h('div', { class: 'hud-boost hidden' }, '✨x2');
  const hud = h(
    'div',
    { class: 'game-hud' },
    pauseBtn,
    h(
      'div',
      { class: 'hud-center' },
      h('div', { class: 'hud-title' }, `${info.icon} ${levelLabel(level)} · ${info.name}`),
      h('div', { class: 'hud-progress' }, progressFill, progressText),
    ),
    h('div', { class: 'hud-right' }, scoreEl, boostEl),
  );
  const timerFill = h('div', { class: 'timer-fill' });
  const timerBar = h('div', { class: 'timer-bar hidden' }, timerFill);
  const stage = h('div', { class: 'game-stage' });
  const powerups = h('div', { class: 'game-powerups' });
  const controls = h('div', { class: 'game-controls' });
  const wrap = h('div', { class: 'game-wrap', style: { '--accent': info.color } }, hud, timerBar, stage, powerups, controls);
  root.appendChild(wrap);

  // ------------------------------------------------------------ game clock
  let alive = true;
  let paused = false;
  let adPaused = false;
  let ended = false;
  let gameTime = 0;
  let last = performance.now();
  let rafId = 0;
  let timerSeq = 0;
  const scheduled = new Map(); // id -> {at, fn, every}
  const frameFns = new Set();
  const pauseFns = new Set();
  let levelTimer = null; // {total, left, onTimeout}

  function loop(now) {
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused && !adPaused && !ended) {
      gameTime += dt;
      for (const [id, t] of scheduled) {
        if (gameTime >= t.at) {
          if (t.every) t.at = gameTime + t.every;
          else scheduled.delete(id);
          try {
            t.fn();
          } catch (e) {
            console.error(e);
          }
        }
      }
      for (const fn of frameFns) {
        try {
          fn(dt, gameTime);
        } catch (e) {
          console.error(e);
        }
      }
      if (levelTimer && levelTimer.left > 0) {
        levelTimer.left -= dt;
        const pct = Math.max(0, levelTimer.left / levelTimer.total);
        timerFill.style.width = pct * 100 + '%';
        timerFill.classList.toggle('low', pct < 0.25);
        if (levelTimer.left <= 0) {
          const cb = levelTimer.onTimeout;
          levelTimer = null;
          cb && cb();
        }
      }
    }
    rafId = requestAnimationFrame(loop);
  }
  rafId = requestAnimationFrame(loop);

  // ------------------------------------------------------------ results
  let correct = 0;
  let wrong = 0;
  let done = 0;
  let bonusCoins = 0;

  function updateHud() {
    progressFill.style.width = Math.min(100, (done / rounds) * 100) + '%';
    progressText.textContent = digits(`${Math.min(done, rounds)} / ${rounds}`);
    scoreEl.textContent = `✔ ${digits(correct)}`;
    boostEl.classList.toggle('hidden', !isBoostActive());
  }
  const boostIv = setInterval(updateHud, 1000);

  const api = {
    level,
    difficulty,
    rounds,
    stage,
    controls,
    powerups,
    get alive() {
      return alive && !ended;
    },
    get paused() {
      return paused || adPaused;
    },
    get correctCount() {
      return correct;
    },
    get wrongCount() {
      return wrong;
    },
    get doneCount() {
      return done;
    },
    /** Record a correct answer. countsAsRound=false for partial credit inside a round. */
    correct(el, { countsAsRound = true, silent = false } = {}) {
      if (!api.alive) return;
      correct++;
      if (countsAsRound) done++;
      if (!silent) {
        sfx('correct');
        flashMark(true);
      }
      if (el) floatAtEl(el, '+1 ✔', '#3bceac');
      updateHud();
    },
    wrong(el, { countsAsRound = true, silent = false } = {}) {
      if (!api.alive) return;
      wrong++;
      if (countsAsRound) done++;
      if (!silent) {
        sfx('wrong');
        vibrate(80);
        flashMark(false);
      }
      if (el) floatAtEl(el, '✘', '#ff4d6d');
      updateHud();
    },
    /** Mark a round finished without scoring it (rarely needed). */
    advance() {
      done++;
      updateHud();
    },
    bonus(coins, el) {
      bonusCoins += coins;
      if (el) floatAtEl(el, `+${digits(coins)} 🪙`, '#ffd23f');
      sfx('coin');
    },
    after(seconds, fn) {
      const id = ++timerSeq;
      scheduled.set(id, { at: gameTime + seconds, fn });
      return id;
    },
    every(seconds, fn) {
      const id = ++timerSeq;
      scheduled.set(id, { at: gameTime + seconds, fn, every: seconds });
      return id;
    },
    cancel(id) {
      scheduled.delete(id);
    },
    onFrame(fn) {
      frameFns.add(fn);
      return () => frameFns.delete(fn);
    },
    onPauseChange(fn) {
      pauseFns.add(fn);
    },
    /** Optional level countdown bar. */
    setTimer(seconds, onTimeout) {
      levelTimer = { total: seconds, left: seconds, onTimeout };
      timerBar.classList.remove('hidden');
      timerFill.style.width = '100%';
    },
    addTime(seconds) {
      if (levelTimer) levelTimer.left = Math.min(levelTimer.total, levelTimer.left + seconds);
    },
    clearTimer() {
      levelTimer = null;
      timerBar.classList.add('hidden');
    },
    /** Adds a rewarded-ad power-up button. Each power-up can be used once per level. */
    addPower({ label, icon = '📺', adUnit, onReward, color = 'gold', hidden = false }) {
      const b = btn(label, {
        color,
        size: 'sm',
        icon: h('span', { class: 'ad-badge' }, icon),
        cls: 'power-btn' + (hidden ? ' hidden' : ''),
        onClick: async () => {
          if (b.disabled || !api.alive) return;
          b.disabled = true;
          const ok = await showRewardedAd(adUnit, (reward) => {
            if (api.alive) onReward(reward);
          });
          if (!ok) b.disabled = false;
          else b.classList.add('used');
        },
      });
      powerups.appendChild(b);
      return {
        el: b,
        show() {
          b.classList.remove('hidden');
        },
        hide() {
          b.classList.add('hidden');
        },
        pulse(on = true) {
          b.classList.toggle('pulse', on);
        },
        get used() {
          return b.classList.contains('used');
        },
      };
    },
    setControls(...buttons) {
      clearChildren(controls);
      buttons.flat().forEach((b) => b && controls.appendChild(b));
    },
    toast,
    sfx,
    /** Ends the level and shows results. */
    finish() {
      if (ended || !alive) return;
      ended = true;
      showResults();
    },
  };

  function setPaused(p) {
    paused = p;
    pauseFns.forEach((fn) => fn(paused || adPaused));
    wrap.classList.toggle('is-paused', paused);
  }

  const onAdOpen = () => {
    adPaused = true;
    pauseFns.forEach((fn) => fn(true));
  };
  const onAdClose = () => {
    adPaused = false;
    last = performance.now();
    pauseFns.forEach((fn) => fn(paused));
  };
  window.addEventListener('mtl:ad-open', onAdOpen);
  window.addEventListener('mtl:ad-close', onAdClose);

  const onVisibility = () => {
    if (document.hidden && !ended && !paused && !adPaused) openPause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  let pauseModal = null;
  function openPause() {
    if (ended || pauseModal) return;
    setPaused(true);
    pauseModal = modal({
      title: t('game.paused'),
      dismissable: false,
      body: h('p', { class: 'text-center text-lg' }, `${info.icon} ${info.name}`),
      buttons: [
        { label: t('game.quit'), color: 'red', onClick: () => ((pauseModal = null), go('map', { level })) },
        { label: t('game.restart'), color: 'blue', onClick: () => ((pauseModal = null), go('game', { level })) },
        {
          label: t('game.resume'),
          color: 'green',
          onClick: () => {
            pauseModal = null;
            last = performance.now();
            setPaused(false);
          },
        },
      ],
    });
  }
  pauseBtn.addEventListener('click', () => {
    sfx('tap');
    openPause();
  });

  // ------------------------------------------------------------ results
  function showResults() {
    const total = correct + wrong;
    const acc = total === 0 ? 0 : correct / total;
    const stars = starsFor(acc);
    const s = getState();
    const passed = stars > 0;
    const starMult = [0.25, 1, 1.25, 1.6][stars];
    const coins = Math.round(baseCoinsFor(level) * (0.5 + 0.5 * acc) * starMult * levelCoinMultiplier()) + bonusCoins;
    recordLevelPlayed(); // daily streak + once-a-day bonus
    addCoins(coins);
    s.stats.levelsPlayed++;
    const prevStars = s.stars[level] || 0;
    if (stars > prevStars) s.stars[level] = stars;
    let unlockedNew = false;
    if (passed && s.unlockedLevel <= level) {
      s.unlockedLevel = level + 1;
      unlockedNew = true;
    }
    saveState();

    sfx(passed ? 'win' : 'lose');
    if (passed) confetti(stars * 30);

    const starRow = h(
      'div',
      { class: 'result-stars' },
      [0, 1, 2].map((i) => h('span', { class: `result-star ${i < stars ? 'on' : ''}`, style: { animationDelay: 0.25 + i * 0.25 + 's' } }, '★')),
    );
    const coinsEl = h('div', { class: 'result-coins' }, `+${fmt(coins)} 🪙`);
    const nextCh = chapterOf(level + 1);
    const chapterDone = passed && chapterOf(level) && (!nextCh || nextCh.id !== chapterOf(level).id);
    const body = h(
      'div',
      { class: 'text-center' },
      starRow,
      passed ? h('div', { class: 'text-2xl font-bold mt-2' }, t('game.praise')[stars]) : nearMiss(correct, wrong),
      passed ? h('div', { class: 'mt-1 opacity-80' }, t('game.accuracy', { pct: Math.round(acc * 100), ok: correct, bad: wrong })) : null,
      coinsEl,
      isBoostActive() ? h('div', { class: 'text-sm text-amber-600 font-bold' }, t('game.boostActive', { m: Math.ceil(boostRemainingMs() / 60000) })) : null,
      chapterDone ? h('div', { class: 'chapter-done' }, t('game.chapterDone', { name: chapterOf(level).name })) : null,
      unlockedNew && level + 1 === MAX_STORY_LEVEL + 1 ? h('div', { class: 'chapter-done' }, t('game.endlessUnlocked')) : null,
    );
    const buttons = [{ label: t('game.map'), color: 'gray', icon: '🗺️', onClick: () => go('map', { level }) }];
    buttons.push({ label: t('game.retry'), color: 'blue', icon: '↻', onClick: () => go('game', { level }) });
    if (passed) buttons.push({ label: t('game.next'), color: 'green', icon: '▶', onClick: () => go('intro', { level: level + 1 }) });
    const resultModal = modal({ title: passed ? t('game.complete', { level: levelLabel(level) }) : t('game.failed'), body, buttons, dismissable: false, cls: 'result-card' });
    // Opt-in rewarded video offer, below the level buttons (wins only; buttons stay usable).
    const offer = passed ? rewardOfferPanel({ level, coins, coinsEl }) : null;
    if (offer) resultModal.el.querySelector('.modal-card').appendChild(offer);
  }

  // ------------------------------------------------------------ start game
  let instance = null;
  try {
    instance = game.start(api);
  } catch (e) {
    console.error('Game failed to start', e);
    toast(t('game.couldNotStart'), 'error');
  }
  updateHud();

  const cleanup = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    clearInterval(boostIv);
    scheduled.clear();
    frameFns.clear();
    window.removeEventListener('mtl:ad-open', onAdOpen);
    window.removeEventListener('mtl:ad-close', onAdClose);
    document.removeEventListener('visibilitychange', onVisibility);
    if (instance && instance.destroy) {
      try {
        instance.destroy();
      } catch (e) {
        console.error(e);
      }
    }
  };
  cleanup.openPause = openPause;
  cleanup.isEnded = () => ended;
  return cleanup;
}
