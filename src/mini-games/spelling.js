// Mini-game 1: Spelling & Picture Check.
// A student's answer sheet shows a picture and a written word. Tap Tick or Cross, then MARK.
import { h, btn, pick, randInt } from '../core/ui.js';
import { AD_UNITS } from '../core/config.js';
import { getState, saveState } from '../core/storage.js';
import { spellingWords, studentNames } from './data.js';
import { t, currentLang, digits } from '../i18n/index.js';

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

// Bangla: real-life mix-ups (ি/ী, ু/ূ, স/শ/ষ, ন/ণ, জ/য, র/ড়, aspirated pairs…).
const BN_SWAPS = {
  'ি': 'ী', 'ী': 'ি', 'ু': 'ূ', 'ূ': 'ু', 'ে': 'ৈ', 'ৈ': 'ে', 'ো': 'া',
  'স': 'শ', 'শ': 'ষ', 'ষ': 'স', 'ন': 'ণ', 'ণ': 'ন', 'জ': 'য', 'য': 'জ', 'র': 'ড়', 'ড়': 'র',
  'ব': 'ভ', 'ভ': 'ব', 'দ': 'ধ', 'ধ': 'দ', 'ত': 'থ', 'থ': 'ত', 'চ': 'ছ', 'ছ': 'চ',
  'গ': 'ঘ', 'ঘ': 'গ', 'ক': 'খ', 'খ': 'ক', 'প': 'ফ', 'ফ': 'প', 'ট': 'ঠ', 'ঠ': 'ট', 'ম': 'ন',
};
const BN_CONSONANT = /[\u0995-\u09B9\u09DC-\u09DF]/;

/** Produces a believable Bangla misspelling. Easy levels change two letters, harder ones one. */
export function misspellBn(word, difficulty) {
  const chars = [...word];
  const swappable = chars.map((c, i) => (BN_SWAPS[c] ? i : -1)).filter((i) => i >= 0);
  const passes = difficulty < 0.35 && swappable.length > 1 ? 2 : 1;
  const used = new Set();
  for (let p = 0; p < passes && used.size < swappable.length; p++) {
    let i;
    do i = pick(swappable);
    while (used.has(i));
    used.add(i);
    chars[i] = BN_SWAPS[chars[i]];
  }
  let out = chars.join('');
  if (out === word) {
    // Nothing swappable: add a vowel sign "া" after the first consonant (e.g. বই → বাই).
    const i = chars.findIndex((c) => BN_CONSONANT.test(c));
    out = i >= 0 ? [...chars.slice(0, i + 1), 'া', ...chars.slice(i + 1)].join('') : word + 'া';
  }
  return out;
}

function makePaper(difficulty) {
  const SPELLING_WORDS = spellingWords();
  const [word, pic] = pick(SPELLING_WORDS);
  const roll = Math.random();
  let shown = word;
  let picture = pic;
  let isCorrect = true;
  if (roll < 0.4) {
    shown = currentLang === 'bn' ? misspellBn(word, difficulty) : misspell(word, difficulty);
    isCorrect = false;
  } else if (roll < 0.52) {
    // Right spelling, wrong picture!
    let other;
    do other = pick(SPELLING_WORDS);
    while (other[0] === word);
    shown = other[0];
    isCorrect = false;
  }
  return { word, shown, picture, isCorrect, student: pick(studentNames()) };
}

export default {
  id: 'spelling',

  start(api) {
    const papers = Array.from({ length: api.rounds }, () => makePaper(api.difficulty));
    let idx = 0;
    let choice = null; // 'tick' | 'cross'
    let locked = false;

    const pile = h('div', { class: 'paper-pile' }, `📄 x${papers.length}`);
    const holder = h('div', { class: 'paper-holder' });
    api.stage.append(h('div', { class: 'desk-scene' }, pile, holder));

    const tickBtn = btn(t('spelling.tick'), { color: 'green', icon: '✔', size: 'lg', cls: 'choice-btn', onClick: () => choose('tick') });
    const crossBtn = btn(t('spelling.cross'), { color: 'red', icon: '✘', size: 'lg', cls: 'choice-btn', onClick: () => choose('cross') });
    const markBtn = btn(t('spelling.mark'), { color: 'orange', icon: '🖍️', size: 'xl', cls: 'action-btn', disabled: true, onClick: mark });
    api.setControls(h('div', { class: 'controls-row' }, tickBtn, crossBtn), markBtn);

    api.addPower({
      label: t('spelling.autoGrade'),
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
      api.toast(t('spelling.bell'), 'error');
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
      pile.textContent = `📄 x${digits(papers.length - idx)}`;
      paperEl = h(
        'div',
        { class: 'paper paper-enter' },
        h('div', { class: 'paper-header' }, h('span', {}, t('spelling.title')), h('span', { class: 'font-hand' }, t('spelling.name', { name: p.student }))),
        h('div', { class: 'paper-question' }, t('spelling.question', { n: idx + 1 })),
        h('div', { class: 'picture-frame' }, p.picture),
        h('div', { class: 'answer-line' }, h('span', { class: 'opacity-60 text-base mr-2' }, t('spelling.answer')), h('span', { class: 'handwriting' }, p.shown)),
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
        paperEl.appendChild(h('div', { class: 'correction' }, p.isCorrect ? t('spelling.wasCorrect') : t('spelling.correctIs', { word: p.word })));
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
      api.toast(t('spelling.autoGradeToast'), 'success');
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

