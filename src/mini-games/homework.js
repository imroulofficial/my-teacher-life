// Mini-game 10: Homework Pile.
// Notebooks come off the pile one by one. Read the answers and file each into a bin:
//   Excellent  = every answer done and ✔
//   Complete   = every answer done, but some ✘
//   Incomplete = at least one answer left blank
// Tap a bin (or drag the notebook onto it). The bell rings when time runs out.
import { h, btn, pick, randInt, shuffle } from '../core/ui.js';
import { studentNames, testSubjects } from './data.js';
import { t, digits } from '../i18n/index.js';

const BINS = ['excellent', 'complete', 'incomplete'];

function makeNotebook(d) {
  const rows = 3 + Math.round(3 * d); // 3..6 answers
  const kind = pick(BINS);
  const marks = Array(rows).fill('ok');
  if (kind === 'complete') {
    const wrong = d < 0.5 && rows > 3 ? 2 : 1;
    shuffle([...marks.keys()]).slice(0, wrong).forEach((i) => (marks[i] = 'bad'));
  } else if (kind === 'incomplete') {
    const blanks = d < 0.5 && rows > 3 ? 2 : 1;
    const idx = shuffle([...marks.keys()]);
    idx.slice(0, blanks).forEach((i) => (marks[i] = 'blank'));
    // A ✘ next to the blanks on harder levels, so a quick glance is not enough.
    if (d >= 0.4 && rows > blanks + 1 && Math.random() < 0.5) marks[idx[blanks]] = 'bad';
  }
  return { kind, marks, name: pick(studentNames()), subject: pick(testSubjects()) };
}

export default {
  id: 'homework',

  start(api) {
    const d = api.difficulty;
    const books = Array.from({ length: api.rounds }, () => makeNotebook(d));

    const pile = h('div', { class: 'hw-pile' });
    const holder = h('div', { class: 'hw-holder' });
    api.stage.append(h('div', { class: 'hw-scene' }, pile, holder));

    const binBtns = BINS.map((kind) =>
      btn(t(`homework.${kind}`), {
        color: { excellent: 'gold', complete: 'green', incomplete: 'orange' }[kind],
        size: 'md',
        icon: { excellent: '🌟', complete: '✅', incomplete: '⏳' }[kind],
        cls: 'hw-bin',
        onClick: () => file(kind),
      }),
    );
    binBtns.forEach((b, i) => {
      b.dataset.bin = BINS[i];
      b.appendChild(h('span', { class: 'hw-rule' }, t(`homework.rule.${BINS[i]}`)));
    });
    api.setControls(h('div', { class: 'hw-bins' }, binBtns));

    let idx = 0;
    let locked = true;
    let note = null;

    const perBook = 7 - 2.5 * d;
    api.setTimer(Math.round(books.length * perBook + 4), () => {
      locked = true;
      for (let i = idx; i < books.length; i++) api.wrong(null, { silent: true });
      idx = books.length;
      api.toast(t('homework.bell'), 'error');
      api.after(0.8, () => api.finish());
    });

    function show() {
      if (!api.alive) return;
      const b = books[idx];
      pile.textContent = `📚 x${digits(books.length - idx)}`;
      note = h(
        'div',
        { class: 'notebook paper-enter' },
        h('div', { class: 'notebook-head' }, h('span', {}, t('homework.title', { subject: b.subject })), h('span', { class: 'font-hand' }, b.name)),
        h(
          'div',
          { class: 'notebook-rows' },
          b.marks.map((m, i) =>
            h(
              'div',
              { class: `nb-row nb-${m}` },
              h('span', { class: 'nb-q' }, digits(`${i + 1}.`)),
              h('span', { class: 'nb-line font-hand' }, m === 'blank' ? '' : '〰〰〰'),
              h('span', { class: 'nb-mark' }, m === 'ok' ? '✔' : m === 'bad' ? '✘' : '?'),
            ),
          ),
        ),
      );
      attachDrag(note);
      holder.replaceChildren(note);
      locked = false;
    }

    function file(kind) {
      if (locked || idx >= books.length) return;
      locked = true;
      const b = books[idx];
      const binEl = binBtns[BINS.indexOf(kind)];
      const right = kind === b.kind;
      note.classList.add('notebook-out');
      if (right) api.correct(binEl);
      else {
        api.wrong(binEl);
        const rightBin = binBtns[BINS.indexOf(b.kind)];
        rightBin.classList.add('hw-reveal');
        api.toast(t('homework.wasActually', { bin: t(`homework.${b.kind}`) }), 'error', 1400);
        api.after(1.2, () => rightBin.classList.remove('hw-reveal'));
      }
      api.after(right ? 0.45 : 1.3, () => {
        idx++;
        if (idx >= books.length) {
          api.clearTimer();
          api.finish();
        } else show();
      });
    }

    // Drag the open notebook onto a bin (tapping a bin works too).
    function attachDrag(el) {
      let start = null;
      el.addEventListener('pointerdown', (e) => {
        if (locked) return;
        start = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
      });
      el.addEventListener('pointermove', (e) => {
        if (!start) return;
        el.style.transform = `translate(${e.clientX - start.x}px, ${e.clientY - start.y}px) rotate(-3deg) scale(0.9)`;
      });
      const end = (e) => {
        if (!start) return;
        start = null;
        el.classList.remove('dragging');
        el.style.transform = '';
        const target = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.closest && x.closest('.hw-bin'));
        if (target) file(target.closest('.hw-bin').dataset.bin);
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    show();
    return { destroy() {} };
  },
};
