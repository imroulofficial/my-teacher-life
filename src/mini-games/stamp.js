// Mini-game 4: Test Result Reaction.
// Read the test paper, stamp A+ (pass) or F (fail). The student reacts!
// Rewarded "Golden Stamp": unique stamp design + golden bonus coins + 5-minute x2 coin boost.
import { h, btn, randInt, pick, shuffle, confetti } from '../core/ui.js';
import { AD_UNITS, BOOSTS } from '../core/config.js';
import { getState, saveState } from '../core/storage.js';
import { activateCoinBoost } from '../core/economy.js';
import { activeDesign, unlockRandomDesign } from '../core/stamps.js';
import { STUDENT_NAMES, STUDENT_FACES } from './data.js';

const SUBJECTS = ['Math', 'English', 'Science', 'History', 'Geography', 'Art', 'Music'];

export default {
  id: 'stamp',
  howTo: [
    'Each paper shows the student\'s marks: ✔ right, ✘ wrong.',
    'Compare the score with the PASS MARK at the top.',
    'Stamp A+ if they passed, F if they failed.',
    'Watch the reaction! Try the ✨ Golden Stamp for a special design and bonus coins.',
  ],

  start(api) {
    const d = api.difficulty;
    const passMark = d < 0.3 ? 50 : d < 0.65 ? 60 : 70;
    const showTotal = d < 0.4;
    let golden = false;

    const rule = h('div', { class: 'pass-rule' }, `PASS MARK: ${passMark}%`);
    const paperHolder = h('div', { class: 'paper-holder' });
    const kidFace = h('div', { class: 'reaction-face' }, '🙂');
    const kidSay = h('div', { class: 'reaction-say hidden' });
    const kid = h('div', { class: 'reaction-kid' }, kidSay, kidFace, h('div', { class: 'reaction-name' }));
    api.stage.append(h('div', { class: 'stamp-scene' }, rule, h('div', { class: 'stamp-row' }, paperHolder, kid)));

    const aBtn = btn('A+', { color: 'green', size: 'xl', cls: 'stamp-btn', onClick: () => stamp('A+') });
    const fBtn = btn('F', { color: 'red', size: 'xl', cls: 'stamp-btn', onClick: () => stamp('F') });
    api.setControls(h('div', { class: 'controls-row' }, aBtn, fBtn));

    api.addPower({
      label: 'Golden Stamp',
      icon: '✨',
      adUnit: AD_UNITS.GOLDEN_STAMP,
      onReward: activateGolden,
    });

    const papers = Array.from({ length: api.rounds }, () => makePaper());
    let idx = 0;
    let locked = false;
    let paperEl = null;

    function makePaper() {
      const n = Math.round(8 + 8 * d); // 8..16 questions
      const pass = Math.random() < 0.5;
      const need = Math.ceil((passMark / 100) * n);
      // How far from the pass line the score is: easy = far, hard = close.
      const margin = Math.max(1, Math.round((1 - d) * n * 0.3) + randInt(0, 1));
      let score = pass ? need + randInt(0, margin) : need - 1 - randInt(0, margin);
      score = Math.max(0, Math.min(n, score));
      const marks = shuffle(Array.from({ length: n }, (_, i) => i < score));
      return {
        name: pick(STUDENT_NAMES),
        face: pick(STUDENT_FACES),
        subject: pick(SUBJECTS),
        n,
        score,
        marks,
        pass: score / n >= passMark / 100,
      };
    }

    function showPaper() {
      const p = papers[idx];
      kidFace.textContent = p.face;
      kid.querySelector('.reaction-name').textContent = p.name;
      kid.className = 'reaction-kid nervous';
      kidSay.classList.add('hidden');
      paperEl = h(
        'div',
        { class: 'paper test-paper paper-enter' },
        h('div', { class: 'paper-header' }, h('span', {}, `${p.subject} Test`), h('span', { class: 'font-hand' }, p.name)),
        h(
          'div',
          { class: 'marks-grid' },
          p.marks.map((ok, i) => h('div', { class: `mark-cell ${ok ? 'ok' : 'bad'}` }, h('span', { class: 'qnum' }, `${i + 1}.`), ok ? '✔' : '✘')),
        ),
        h('div', { class: 'score-line' }, showTotal ? `Score: ${p.score} / ${p.n}` : `Score: ___ / ${p.n}`),
        h('div', { class: 'stamp-slot big' }),
      );
      paperHolder.replaceChildren(paperEl);
      locked = false;
    }

    function stamp(grade) {
      if (locked) return;
      locked = true;
      const p = papers[idx];
      const design = activeDesign();
      const slot = paperEl.querySelector('.stamp-slot');
      slot.appendChild(
        h(
          'div',
          {
            class: `grade-stamp ${grade === 'A+' ? 'pass' : 'fail'} ${golden ? 'golden' : ''}`,
            style: golden ? {} : { color: grade === 'A+' ? design.color : '#e11d48', borderColor: grade === 'A+' ? design.color : '#e11d48' },
          },
          golden || design.id !== 'classic' ? h('span', { class: 'stamp-deco' }, design.icon) : null,
          grade,
        ),
      );
      api.sfx('stamp');
      const right = (grade === 'A+') === p.pass;
      // Student reaction depends on the grade they got.
      if (grade === 'A+') {
        kid.className = 'reaction-kid happy';
        kidFace.textContent = pick(['🥳', '😁', '🤩']);
        kidSay.textContent = pick(['Yay!!', 'I did it!', 'Best day ever!', 'Woohoo!']);
      } else {
        kid.className = 'reaction-kid shocked';
        kidFace.textContent = pick(['😱', '😭', '🙀']);
        kidSay.textContent = pick(['Noooo!', 'Whaaat?!', 'My mom…', 'Not again!']);
      }
      kidSay.classList.remove('hidden');
      if (right) {
        api.correct(paperEl);
        if (golden) api.bonus(10 + api.level, paperEl);
      } else {
        api.wrong(paperEl);
        paperEl.appendChild(h('div', { class: 'correction' }, `Real score: ${p.score}/${p.n} (${Math.round((p.score / p.n) * 100)}%) → ${p.pass ? 'A+' : 'F'}`));
      }
      getState().stats.papersMarked++;
      saveState();
      api.after(right ? 1.1 : 1.9, next);
    }

    function next() {
      if (!api.alive) return;
      paperEl.classList.add('paper-exit');
      idx++;
      if (idx >= papers.length) api.after(0.4, () => api.finish());
      else api.after(0.25, showPaper);
    }

    function activateGolden() {
      golden = true;
      activateCoinBoost(BOOSTS.goldenStampMinutes);
      const design = unlockRandomDesign();
      confetti(80);
      api.sfx('star');
      paperHolder.classList.add('golden-glow');
      api.toast(
        design
          ? `✨ Golden Stamp! New design unlocked: ${design.icon} ${design.name}. Coins x${BOOSTS.goldenStampMultiplier} for ${BOOSTS.goldenStampMinutes} min!`
          : `✨ Golden Stamp! Coins x${BOOSTS.goldenStampMultiplier} for ${BOOSTS.goldenStampMinutes} min!`,
        'success',
        3200,
      );
    }

    showPaper();
    return { destroy() {} };
  },
};
