// Mini-game 1: Spelling & Picture Check.
// A student's answer sheet shows a picture and a written word. Tap Tick or Cross, then MARK.
import { h, btn, pick, randInt } from '../core/ui.js';
import { AD_UNITS } from '../core/config.js';
import { getState, saveState } from '../core/storage.js';
import { SPELLING_WORDS, STUDENT_NAMES } from './data.js';

const VOWELS = 'aeiou';
const SWAPS = { c: 'k', k: 'c', s: 'z', z: 's', f: 'v', v: 'f', b: 'd', d: 'b', m: 'n', n: 'm', p: 'q', g: 'j' };

function capitalize(w) {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Produces a believable misspelling of `word`. Harder levels = subtler mistakes. */
export function misspell(word, difficulty) {
  const w = word.toLowerCase();
  const strategies = [
    // replace a vowel (Grapes -> Grepes)
    () => {
      const idx = [...w].map((c, i) => (VOWELS.includes(c) ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return null;
      const i = pick(idx);
      const nv = pick([...VOWELS].filter((v) => v !== w[i]));
      return w.slice(0, i) + nv + w.slice(i + 1);
    },
    // swap two adjacent letters (Monkey -> Mnokey)
    () => {
      if (w.length < 3) return null;
      const i = randInt(1, w.length - 2);
      if (w[i] === w[i + 1]) return null;
      return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
    },
    // drop a letter (Rabbit -> Rabit)
    () => {
      if (w.length < 4) return null;
      const i = randInt(1, w.length - 1);
      return w.slice(0, i) + w.slice(i + 1);
    },
    // double a letter (Lemon -> Lemmon)
    () => {
      const i = randInt(1, w.length - 1);
      return w.slice(0, i) + w[i] + w.slice(i);
    },
    // similar consonant (Cat -> Kat)
    () => {
      const idx = [...w].map((c, i) => (SWAPS[c] ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) return null;
      const i = pick(idx);
      return w.slice(0, i) + SWAPS[w[i]] + w.slice(i + 1);
    },
  ];
  // Easy levels: allow 2 mistakes in one word so it is obvious.
  const passes = difficulty < 0.35 && w.length > 4 ? 2 : 1;
  let out = w;
  for (let tries = 0; tries < 30; tries++) {
    let cand = w;
    for (let p = 0; p < passes; p++) cand = pick(strategies)() || cand;
    if (cand !== w) {
      out = cand;
      break;
    }
  }
  return capitalize(out);
}

function makePaper(difficulty) {
  const [word, pic] = pick(SPELLING_WORDS);
  const roll = Math.random();
  let shown = word;
  let picture = pic;
  let isCorrect = true;
  if (roll < 0.4) {
    shown = misspell(word, difficulty);
    isCorrect = false;
  } else if (roll < 0.52) {
    // Right spelling, wrong picture!
    let other;
    do other = pick(SPELLING_WORDS);
    while (other[0] === word);
    shown = other[0];
    isCorrect = false;
  }
  return { word, shown, picture, isCorrect, student: pick(STUDENT_NAMES) };
}

export default {
  id: 'spelling',
  howTo: [
    'Look at the picture and the word the student wrote.',
    'If the word is spelled correctly AND matches the picture, tap ✔ TICK.',
    'If anything is wrong, tap ✘ CROSS.',
    'Press MARK to grade the paper. Be quick before the bell rings!',
  ],

  start(api) {
    const papers = Array.from({ length: api.rounds }, () => makePaper(api.difficulty));
    let idx = 0;
    let choice = null; // 'tick' | 'cross'
    let locked = false;

    const pile = h('div', { class: 'paper-pile' }, `📄 x${papers.length}`);
    const holder = h('div', { class: 'paper-holder' });
    api.stage.append(h('div', { class: 'desk-scene' }, pile, holder));

    const tickBtn = btn('TICK', { color: 'green', icon: '✔', size: 'lg', cls: 'choice-btn', onClick: () => choose('tick') });
    const crossBtn = btn('CROSS', { color: 'red', icon: '✘', size: 'lg', cls: 'choice-btn', onClick: () => choose('cross') });
    const markBtn = btn('MARK', { color: 'orange', icon: '🖍️', size: 'xl', cls: 'action-btn', disabled: true, onClick: mark });
    api.setControls(h('div', { class: 'controls-row' }, tickBtn, crossBtn), markBtn);

    api.addPower({
      label: 'Auto-Grade All',
      icon: '📺',
      adUnit: AD_UNITS.AUTO_GRADE,
      onReward: autoGradeAll,
    });

    // Bell timer: generous at first, tighter later.
    let auto = false;
    const scored = new Set();
    const perPaper = 8 - 3.5 * api.difficulty;
    api.setTimer(Math.round(papers.length * perPaper + 4), () => {
      if (auto) return;
      // Time's up: every ungraded paper counts as missed.
      locked = true;
      for (let i = 0; i < papers.length; i++) {
        if (!scored.has(i)) {
          scored.add(i);
          api.wrong(null, { silent: true });
        }
      }
      idx = papers.length;
      api.toast('🔔 The bell rang!', 'error');
      api.after(0.8, () => api.finish());
    });

    function choose(c) {
      if (locked) return;
      choice = c;
      tickBtn.classList.toggle('selected', c === 'tick');
      crossBtn.classList.toggle('selected', c === 'cross');
      markBtn.disabled = false;
      api.sfx('select');
    }

    let paperEl = null;
    function showPaper() {
      const p = papers[idx];
      choice = null;
      tickBtn.classList.remove('selected');
      crossBtn.classList.remove('selected');
      markBtn.disabled = true;
      pile.textContent = `📄 x${papers.length - idx}`;
      paperEl = h(
        'div',
        { class: 'paper paper-enter' },
        h('div', { class: 'paper-header' }, h('span', {}, 'Spelling Test'), h('span', { class: 'font-hand' }, `Name: ${p.student}`)),
        h('div', { class: 'paper-question' }, `Q${idx + 1}. Write the name of this picture:`),
        h('div', { class: 'picture-frame' }, p.picture),
        h('div', { class: 'answer-line' }, h('span', { class: 'opacity-60 text-base mr-2' }, 'Answer:'), h('span', { class: 'handwriting' }, p.shown)),
        h('div', { class: 'stamp-slot' }),
      );
      holder.replaceChildren(paperEl);
    }

    function stampPaper(tick) {
      const slot = paperEl.querySelector('.stamp-slot');
      slot.replaceChildren(h('div', { class: `red-mark ${tick ? 'tick' : 'cross'}` }, tick ? '✔' : '✘'));
    }

    function mark() {
      if (locked || !choice || idx >= papers.length) return;
      locked = true;
      markBtn.disabled = true;
      const p = papers[idx];
      const saidCorrect = choice === 'tick';
      const right = saidCorrect === p.isCorrect;
      stampPaper(saidCorrect);
      api.sfx('stamp');
      getState().stats.papersMarked++;
      saveState();
      scored.add(idx);
      if (right) api.correct(paperEl);
      else {
        api.wrong(paperEl);
        paperEl.appendChild(h('div', { class: 'correction' }, p.isCorrect ? 'It was correct!' : `Correct: ${p.word}`));
      }
      api.after(right ? 0.7 : 1.4, nextPaper);
    }

    function nextPaper() {
      if (!api.alive || idx >= papers.length) return;
      paperEl.classList.add('paper-exit');
      idx++;
      if (idx >= papers.length) {
        api.clearTimer();
        api.after(0.4, () => api.finish());
        return;
      }
      api.after(auto ? 0.12 : 0.25, () => {
        showPaper();
        if (auto) runAuto();
        else locked = false;
      });
    }

    // Rewarded "Auto-Grade All": every remaining paper is graded perfectly.
    function autoGradeAll() {
      auto = true;
      api.clearTimer();
      api.toast('🤖 Auto-Grade: grading every paper perfectly!', 'success');
      if (!locked) runAuto(); // otherwise nextPaper() continues the chain
    }

    function runAuto() {
      if (!api.alive || idx >= papers.length) return;
      locked = true;
      const p = papers[idx];
      stampPaper(p.isCorrect);
      api.sfx('stamp');
      scored.add(idx);
      api.correct(null, { silent: true });
      getState().stats.papersMarked++;
      saveState();
      api.after(0.3, nextPaper);
    }

    showPaper();
    return { destroy() {} };
  },
};

