// Runs one level: HUD, pause, game clock, power-ups and results.
// Boss levels run 2-3 mini-games back to back as stages; failing any stage fails the boss.
import { h, btn, modal, toast, confetti, floatAtEl, flashMark, fmt, clearChildren } from './ui.js';
import { sfx, vibrate } from './audio.js';
import { getState, saveState } from './storage.js';
import { showRewardedAd } from './ads.js';
import { GAME_INFO, gameForLevel, difficultyFor, roundsFor, baseCoinsFor, levelLabel, chapterOf, bossStages, bossRounds, BOSS_COIN_MULTIPLIER } from './levels.js';
import { addCoins, levelCoinMultiplier, isBoostActive, boostRemainingMs } from './economy.js';
import { GAMES } from '../mini-games/index.js';
import { rewardOfferPanel } from './reward-offer.js';
import { recordLevelPlayed, nearMiss } from './engagement.js';
import { recordLevelResult } from './achievements.js';
import { t, digits, currentLang } from '../i18n/index.js';
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
  const stages = bossStages(level) || [gameId];
  const boss = gameId === 'boss';
  let stageIdx = 0;
  let stageGame = stages[0];
  let info = GAME_INFO[stageGame];
  let difficulty = difficultyFor(level, stageGame);
  let rounds = boss ? bossRounds(level, stageGame) : roundsFor(level, stageGame);

  // ---------------------------------------------------------------- layout
  const pauseBtn = h('button', { class: 'hud-icon-btn', 'aria-label': 'Pause' }, '⏸');
  const progressFill = h('div', { class: 'hud-progress-fill' });
  const progressText = h('div', { class: 'hud-progress-text' }, `0 / ${rounds}`);
  const scoreEl = h('div', { class: 'hud-score' }, '✔ 0');
  const hudTitle = h('div', { class: 'hud-title' });
  const boostEl = h('div', { class: 'hud-boost hidden' }, '✨x2');
  const hud = h(
    'div',
    { class: 'game-hud' },
    pauseBtn,
    h(
      'div',
      { class: 'hud-center' },
      hudTitle,
      h('div', { class: 'hud-progress' }, progressFill, progressText),
    ),
    h('div', { class: 'hud-right' }, scoreEl, boostEl),
  );
  const timerFill = h('div', { class: 'timer-fill' });
  const timerBar = h('div', { class: 'timer-bar hidden' }, timerFill);
  const stage = h('div', { class: 'game-stage' });
  const powerups = h('div', { class: 'game-powerups' });
  const controls = h('div', { class: 'game-controls' });
  const wrap = h('div', { class: `game-wrap ${boss ? 'is-boss' : ''}` }, hud, timerBar, stage, powerups, controls);
  root.appendChild(wrap);

  function applyStageLook() {
    wrap.style.setProperty('--accent', info.color);
    hudTitle.textContent = boss
      ? `👑 ${levelLabel(level)} · ${digits(`${stageIdx + 1}/${stages.length}`)} ${info.icon} ${info.name}`
      : `${info.icon} ${levelLabel(level)} · ${info.name}`;
  }
  applyStageLook();

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
  let correct = 0; // whole level (all boss stages)
  let wrong = 0;
  let stageCorrect = 0; // current boss stage
  let stageWrong = 0;
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
    get difficulty() {
      return difficulty;
    },
    get rounds() {
      return rounds;
    },
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
      return stageCorrect;
    },
    get wrongCount() {
      return stageWrong;
    },
    get doneCount() {
      return done;
    },
    /** Record a correct answer. countsAsRound=false for partial credit inside a round. */
    correct(el, { countsAsRound = true, silent = false } = {}) {
      if (!api.alive) return;
      correct++;
      stageCorrect++;
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
      stageWrong++;
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
    /** Ends the level (or the current boss stage) and shows results. */
    finish() {
      if (ended || !alive) return;
      if (boss) {
        const n = stageCorrect + stageWrong;
        if (starsFor(n ? stageCorrect / n : 0) === 0) {
          ended = true;
          showResults({ failedStage: stageIdx });
          return;
        }
        if (stageIdx < stages.length - 1) {
          nextStage();
          return;
        }
      }
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
  function showResults({ failedStage = -1 } = {}) {
    const total = correct + wrong;
    const acc = total === 0 ? 0 : correct / total;
    // A boss is only won when every stage passed (each stage needs 50%+, so the total does too).
    const stars = failedStage >= 0 ? 0 : starsFor(acc);
    const s = getState();
    const passed = stars > 0;
    const bossWon = boss && passed;
    const starMult = [0.25, 1, 1.25, 1.6][stars];
    const coins = Math.round(baseCoinsFor(level) * (0.5 + 0.5 * acc) * starMult * levelCoinMultiplier() * (bossWon ? BOSS_COIN_MULTIPLIER : 1)) + bonusCoins;
    if (bossWon) s.bossWins[level] = true;
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
    recordLevelResult({ passed, correct, wrong, seconds: gameTime, lang: currentLang }); // badges (celebrated after the coins)

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
      passed ? h('div', { class: 'text-2xl font-bold mt-2' }, t('game.praise')[stars]) : null,
      failedStage >= 0 ? h('div', { class: 'boss-failed-stage' }, t('boss.failedStage', { n: failedStage + 1, total: stages.length, name: info.name })) : null,
      // Near-miss encouragement uses the stage that was lost on a boss level.
      passed ? null : boss ? nearMiss(stageCorrect, stageWrong) : nearMiss(correct, wrong),
      passed ? h('div', { class: 'mt-1 opacity-80' }, t('game.accuracy', { pct: Math.round(acc * 100), ok: correct, bad: wrong })) : null,
      bossWon ? h('div', { class: 'boss-badge-line' }, t('boss.badge', { mult: BOSS_COIN_MULTIPLIER })) : null,
      coinsEl,
      isBoostActive() ? h('div', { class: 'text-sm text-amber-600 font-bold' }, t('game.boostActive', { m: Math.ceil(boostRemainingMs() / 60000) })) : null,
      chapterDone ? h('div', { class: 'chapter-done' }, t('game.chapterDone', { name: chapterOf(level).name })) : null,
      unlockedNew && level + 1 === MAX_STORY_LEVEL + 1 ? h('div', { class: 'chapter-done' }, t('game.endlessUnlocked')) : null,
    );
    const buttons = [{ label: t('game.map'), color: 'gray', icon: '🗺️', onClick: () => go('map', { level }) }];
    buttons.push({ label: t('game.retry'), color: 'blue', icon: '↻', onClick: () => go('game', { level }) });
    if (passed) buttons.push({ label: t('game.next'), color: 'green', icon: '▶', onClick: () => go('intro', { level: level + 1 }) });
    const title = bossWon ? t('boss.complete', { level: levelLabel(level) }) : passed ? t('game.complete', { level: levelLabel(level) }) : t('game.failed');
    const resultModal = modal({ title, body, buttons, dismissable: false, cls: 'result-card' });
    // Opt-in rewarded video offer, below the level buttons (wins only; buttons stay usable).
    const offer = passed ? rewardOfferPanel({ level, coins, coinsEl }) : null;
    if (offer) resultModal.el.querySelector('.modal-card').appendChild(offer);
  }

  // ------------------------------------------------------------ start game / boss stages
  let instance = null;

  function startStage() {
    try {
      instance = GAMES[stageGame].start(api);
    } catch (e) {
      console.error('Game failed to start', e);
      toast(t('game.couldNotStart'), 'error');
    }
    updateHud();
  }

  function destroyInstance() {
    if (instance && instance.destroy) {
      try {
        instance.destroy();
      } catch (e) {
        console.error(e);
      }
    }
    instance = null;
  }

  /** Boss levels: a short banner, then the next lesson starts straight away (no menus in between). */
  function stageBanner(then) {
    const banner = h(
      'div',
      { class: 'boss-banner' },
      h('div', { class: 'boss-banner-step' }, t('boss.stage', { n: stageIdx + 1, total: stages.length })),
      h('div', { class: 'boss-banner-icon' }, info.icon),
      h('div', { class: 'boss-banner-game' }, info.name),
    );
    stage.appendChild(banner);
    sfx('whoosh');
    api.after(1.3, () => {
      banner.remove();
      then();
    });
  }

  function nextStage() {
    destroyInstance();
    scheduled.clear();
    frameFns.clear();
    pauseFns.clear();
    levelTimer = null;
    timerBar.classList.add('hidden');
    clearChildren(stage);
    clearChildren(controls);
    clearChildren(powerups);
    stageIdx++;
    stageGame = stages[stageIdx];
    info = GAME_INFO[stageGame];
    difficulty = difficultyFor(level, stageGame);
    rounds = bossRounds(level, stageGame);
    stageCorrect = 0;
    stageWrong = 0;
    done = 0;
    applyStageLook();
    updateHud();
    stageBanner(startStage);
  }

  if (boss) {
    updateHud();
    stageBanner(startStage);
  } else startStage();

  const cleanup = () => {
    alive = false;
    cancelAnimationFrame(rafId);
    clearInterval(boostIv);
    scheduled.clear();
    frameFns.clear();
    window.removeEventListener('mtl:ad-open', onAdOpen);
    window.removeEventListener('mtl:ad-close', onAdClose);
    document.removeEventListener('visibilitychange', onVisibility);
    destroyInstance();
  };
  cleanup.openPause = openPause;
  cleanup.isEnded = () => ended;
  return cleanup;
}
