// Mini-game 9: Blackboard Math.
// A sum is written on the board; tap the right answer out of four before the chalk timer runs out.
// Early levels: + and −. Middle: × and ÷. Late: fractions and percentages.
import { h, btn, pick, randInt, shuffle } from '../core/ui.js';
import { t, digits } from '../i18n/index.js';

function addSub(d) {
  const max = 10 + Math.round(40 * d);
  const a = randInt(2, max);
  const b = randInt(1, max);
  if (Math.random() < 0.5) return { text: digits(`${a} + ${b} = ?`), answer: a + b };
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return { text: digits(`${hi} − ${lo} = ?`), answer: hi - lo };
}

function mulDiv(d) {
  const a = randInt(2, 5 + Math.round(7 * d));
  const b = randInt(2, 10);
  if (Math.random() < 0.55) return { text: digits(`${a} × ${b} = ?`), answer: a * b };
  return { text: digits(`${a * b} ÷ ${a} = ?`), answer: b };
}

function fracPct(d) {
  if (Math.random() < 0.5) {
    const den = pick(d < 0.85 ? [2, 3, 4, 5] : [3, 4, 5, 6, 8, 10]);
    const num = pick([...Array(den - 1).keys()].map((k) => k + 1).filter((k) => gcd(k, den) === 1)); // lowest terms
    const n = den * randInt(2, d < 0.85 ? 8 : 12);
    return { text: t('math.fractionOf', { a: num, b: den, n }), answer: (n / den) * num };
  }
  const p = pick(d < 0.85 ? [10, 20, 25, 50] : [5, 15, 20, 25, 40, 75]);
  const step = 100 / gcd(p, 100); // smallest whole number that gives a whole answer
  const n = step * randInt(1, Math.max(2, Math.floor(200 / step)));
  return { text: t('math.percentOf', { p, n }), answer: (p * n) / 100 };
}

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/** One problem for difficulty d (0..1). Harder tiers still mix in some easier ones. */
function makeProblem(d) {
  const tier = d < 0.34 ? 0 : d < 0.67 ? 1 : 2;
  const roll = Math.random();
  const use = roll < 0.7 ? tier : Math.max(0, tier - 1);
  return [addSub, mulDiv, fracPct][use](d);
}

/** Three believable wrong answers. */
function distractors(answer) {
  const out = new Set();
  const deltas = shuffle([1, -1, 2, -2, 10, -10, 5, -5, 3, -3]);
  for (const k of deltas) {
    const v = answer + k;
    if (v >= 0 && v !== answer) out.add(v);
    if (out.size === 3) break;
  }
  return [...out];
}

export default {
  id: 'math',

  start(api) {
    const d = api.difficulty;
    const problems = Array.from({ length: api.rounds }, () => makeProblem(d));

    const boardQ = h('div', { class: 'math-problem' });
    const boardA = h('div', { class: 'chalk-answer' });
    const counter = h('div', { class: 'math-counter' });
    const board = h('div', { class: 'chalkboard math-board' }, h('div', { class: 'chalk-label' }, t('math.label')), counter, boardQ, boardA);
    api.stage.append(h('div', { class: 'math-scene' }, board, h('div', { class: 'math-teacher bob' }, '👨‍🏫')));

    const opts = Array.from({ length: 4 }, (_, i) => btn('', { color: 'blue', size: 'lg', cls: 'math-opt', onClick: () => choose(i) }));
    api.setControls(h('div', { class: 'math-grid' }, opts));

    let idx = 0;
    let values = [];
    let locked = true;
    const perProblem = 12 - 5 * d;

    function show() {
      if (!api.alive) return;
      const p = problems[idx];
      boardQ.textContent = p.text;
      boardA.textContent = '';
      boardA.classList.remove('show');
      counter.textContent = digits(`${idx + 1}/${problems.length}`);
      values = shuffle([p.answer, ...distractors(p.answer)]);
      opts.forEach((b, i) => {
        b.querySelector('.btn-label').textContent = digits(values[i]);
        b.classList.remove('right', 'wrong-pick');
        b.disabled = false;
      });
      locked = false;
      api.setTimer(perProblem, () => {
        if (locked) return;
        api.toast(t('math.tooSlow'), 'error');
        resolve(-1);
      });
    }

    function choose(i) {
      if (locked) return;
      resolve(i);
    }

    function resolve(i) {
      locked = true;
      api.clearTimer();
      const p = problems[idx];
      const right = i >= 0 && values[i] === p.answer;
      opts.forEach((b, k) => {
        b.disabled = true;
        if (values[k] === p.answer) b.classList.add('right');
        else if (k === i) b.classList.add('wrong-pick');
      });
      boardA.textContent = `✔ ${digits(p.answer)}`;
      boardA.classList.add('show');
      if (right) api.correct(opts[i]);
      else api.wrong(i >= 0 ? opts[i] : null);
      api.after(right ? 0.9 : 1.6, () => {
        idx++;
        if (idx >= problems.length) api.finish();
        else show();
      });
    }

    show();
    return { destroy() {} };
  },
};
