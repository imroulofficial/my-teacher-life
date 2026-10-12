// Mini-game 7: Line Match Assessment.
// A student matched animals to their homes with pencil lines.
// Press TICK if every line is right, CROSS if there is a mistake — then draw the correct lines to fix it!
import { h, btn, pick, shuffle, randInt } from '../core/ui.js';
import { AD_UNITS } from '../core/config.js';
import { getState, saveState } from '../core/storage.js';
import { ANIMAL_HOMES, STUDENT_NAMES } from './data.js';

export default {
  id: 'match',
  howTo: [
    'A student drew lines matching animals to their homes.',
    'All lines correct? Press ✔ TICK. Any mistake? Press ✘ CROSS.',
    'After a correct CROSS, fix the red lines: drag (or tap) from the animal to its real home.',
    'Short on time? Use 🤖 Auto-Grade All.',
  ],

  start(api) {
    const d = api.difficulty;
    const pairs = 3 + Math.round(2 * d); // 3..5
    const sheet = h('div', { class: 'match-sheet paper' });
    const header = h('div', { class: 'paper-header' });
    const cols = h('div', { class: 'match-cols' });
    const left = h('div', { class: 'match-col' });
    const right = h('div', { class: 'match-col' });
    const canvas = h('canvas', { class: 'match-canvas' });
    const hint = h('div', { class: 'match-hint' });
    cols.append(left, right);
    sheet.append(header, h('div', { class: 'match-area' }, cols, canvas), hint);
    api.stage.append(h('div', { class: 'match-scene' }, sheet));

    const tickBtn = btn('TICK', { color: 'green', icon: '✔', size: 'xl', cls: 'action-btn', onClick: () => judge(true) });
    const crossBtn = btn('CROSS', { color: 'red', icon: '✘', size: 'xl', cls: 'action-btn', onClick: () => judge(false) });
    api.setControls(h('div', { class: 'controls-row' }, tickBtn, crossBtn));

    let auto = false;
    api.addPower({ label: 'Auto-Grade All', icon: '📺', adUnit: AD_UNITS.AUTO_GRADE, onReward: autoGrade });

    const ctx = canvas.getContext('2d');
    let sheetData = null;
    let phase = 'judge'; // judge | fix | wait
    let round = 0;
    let dragFrom = null; // animal index
    let dragPoint = null;
    let tapFrom = null;

    function makeSheet() {
      const chosen = shuffle(ANIMAL_HOMES).slice(0, pairs + (d > 0.6 ? 1 : 0));
      const items = chosen.slice(0, pairs);
      const decoy = chosen[pairs] || null;
      const homes = shuffle([...items.map((x) => x.homeName), ...(decoy ? [decoy.homeName] : [])]);
      const homeInfo = Object.fromEntries(chosen.map((x) => [x.homeName, x.home]));
      // Student answers: start correct, then add mistakes half the time.
      const answers = items.map((x) => x.homeName);
      const hasMistake = Math.random() < 0.5;
      if (hasMistake) {
        if (decoy && Math.random() < 0.5) {
          answers[randInt(0, pairs - 1)] = decoy.homeName;
        } else {
          const a = randInt(0, pairs - 1);
          let b = randInt(0, pairs - 2);
          if (b >= a) b++;
          [answers[a], answers[b]] = [answers[b], answers[a]];
        }
      }
      return { items, homes, homeInfo, answers, hasMistake, student: pick(STUDENT_NAMES), fixed: new Set() };
    }

    function render() {
      sheetData = makeSheet();
      const s = sheetData;
      header.replaceChildren(h('span', {}, 'Match the Animal to its Home'), h('span', { class: 'font-hand' }, s.student));
      left.replaceChildren(
        ...s.items.map((it, i) =>
          h('div', { class: 'match-card match-animal', dataset: { idx: i } }, h('span', { class: 'match-emoji' }, it.animal), h('span', { class: 'match-label' }, it.name), h('span', { class: 'match-dot' })),
        ),
      );
      right.replaceChildren(
        ...s.homes.map((name) =>
          h('div', { class: 'match-card match-home', dataset: { home: name } }, h('span', { class: 'match-dot' }), h('span', { class: 'match-emoji' }, s.homeInfo[name]), h('span', { class: 'match-label' }, name)),
        ),
      );
      left.querySelectorAll('.match-animal').forEach((el) => attachDraw(el));
      right.querySelectorAll('.match-home').forEach((el) =>
        el.addEventListener('click', () => {
          if (phase === 'fix' && tapFrom !== null) tryFix(tapFrom, el.dataset.home);
        }),
      );
      phase = 'wait';
      hint.textContent = '';
      sheet.classList.remove('paper-exit', 'paper-enter');
      void sheet.offsetWidth; // restart the slide-in animation
      sheet.classList.add('paper-enter');
      tickBtn.disabled = crossBtn.disabled = false;
      // Let layout settle before drawing lines.
      requestAnimationFrame(() => {
        resize();
        draw();
        phase = 'judge';
        if (auto) autoStep();
      });
      // Redraw once the slide-in animation has finished so lines sit exactly on the dots.
      sheet.addEventListener(
        'animationend',
        () => {
          resize();
          draw();
        },
        { once: true },
      );
    }

    function anchor(el) {
      const dot = el.querySelector('.match-dot');
      const r = dot.getBoundingClientRect();
      const base = canvas.getBoundingClientRect();
      return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
    }

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function line(a, b, color, width = 4, dash = []) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      // gentle hand-drawn curve
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 + (b.y - a.y) * 0.08 + 6;
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function draw() {
      if (!sheetData) return;
      const s = sheetData;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const animals = left.querySelectorAll('.match-animal');
      s.items.forEach((it, i) => {
        const a = anchor(animals[i]);
        const homeEl = right.querySelector(`[data-home="${CSS.escape(s.answers[i])}"]`);
        if (!homeEl) return;
        const b = anchor(homeEl);
        const wrong = s.answers[i] !== it.homeName;
        if (phase === 'fix' || phase === 'reveal') {
          if (s.fixed.has(i)) {
            const real = right.querySelector(`[data-home="${CSS.escape(it.homeName)}"]`);
            line(a, anchor(real), '#16a34a', 5);
          } else if (wrong) line(a, b, '#ef4444', 4, [8, 7]);
          else line(a, b, '#64748b', 4);
        } else line(a, b, '#475569', 4);
      });
      if (dragFrom !== null && dragPoint) line(anchor(animals[dragFrom]), dragPoint, '#2563eb', 5);
    }

    function judge(saysAllCorrect) {
      if (phase !== 'judge') return;
      const s = sheetData;
      const right = saysAllCorrect === !s.hasMistake;
      tickBtn.disabled = crossBtn.disabled = true;
      getState().stats.papersMarked++;
      saveState();
      if (right) api.correct(sheet);
      else api.wrong(sheet);
      if (right && s.hasMistake) {
        // Fix phase: draw the right lines.
        phase = 'fix';
        hint.textContent = '✏️ Fix the red lines: drag from the animal to its real home!';
        markWrongAnimals();
        draw();
      } else {
        phase = 'reveal';
        if (!right) {
          hint.textContent = s.hasMistake ? '❗ There was a mistake (red line).' : '❗ Every line was correct.';
          s.items.forEach((it, i) => s.answers[i] !== it.homeName && s.fixed.add(i));
        }
        draw();
        api.after(right ? 0.9 : 1.8, nextSheet);
      }
    }

    function markWrongAnimals() {
      const animals = left.querySelectorAll('.match-animal');
      sheetData.items.forEach((it, i) => animals[i].classList.toggle('needs-fix', sheetData.answers[i] !== it.homeName && !sheetData.fixed.has(i)));
    }

    function tryFix(i, homeName) {
      const s = sheetData;
      const it = s.items[i];
      const animals = left.querySelectorAll('.match-animal');
      tapFrom = null;
      animals.forEach((a) => a.classList.remove('selected'));
      if (s.answers[i] === it.homeName || s.fixed.has(i)) return;
      if (homeName === it.homeName) {
        s.fixed.add(i);
        api.bonus(5 + Math.round(api.level / 2), animals[i]);
        api.sfx('correct');
      } else {
        api.sfx('wrong');
        animals[i].classList.add('shake');
        setTimeout(() => animals[i].classList.remove('shake'), 400);
      }
      markWrongAnimals();
      draw();
      const allFixed = s.items.every((x, k) => s.answers[k] === x.homeName || s.fixed.has(k));
      if (allFixed) {
        phase = 'reveal';
        hint.textContent = '🌟 All fixed!';
        api.after(0.9, nextSheet);
      }
    }

    function attachDraw(el) {
      const i = Number(el.dataset.idx);
      el.addEventListener('pointerdown', (e) => {
        if (phase !== 'fix') return;
        dragFrom = i;
        dragPoint = null;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', (e) => {
        if (dragFrom === null) return;
        const base = canvas.getBoundingClientRect();
        dragPoint = { x: e.clientX - base.left, y: e.clientY - base.top };
        draw();
      });
      const end = (e) => {
        if (dragFrom === null) return;
        const from = dragFrom;
        const moved = !!dragPoint;
        dragFrom = null;
        dragPoint = null;
        if (moved) {
          const home = [...right.querySelectorAll('.match-home')].find((hEl) => {
            const r = hEl.getBoundingClientRect();
            return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
          });
          if (home) tryFix(from, home.dataset.home);
          else draw();
        } else {
          // Tap mode: select animal, then tap a home.
          tapFrom = from;
          left.querySelectorAll('.match-animal').forEach((a, k) => a.classList.toggle('selected', k === from));
          api.sfx('select');
          draw();
        }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    function nextSheet() {
      if (!api.alive) return;
      round++;
      sheet.classList.add('paper-exit');
      if (round >= api.rounds) {
        api.after(0.4, () => api.finish());
        return;
      }
      api.after(0.3, render);
    }

    // Rewarded Auto-Grade: every remaining worksheet graded (and fixed) perfectly.
    function autoGrade() {
      auto = true;
      api.toast('🤖 Auto-Grade: checking every worksheet perfectly!', 'success');
      if (phase === 'judge' || phase === 'fix') autoStep();
    }

    function autoStep() {
      if (!api.alive) return;
      const s = sheetData;
      if (phase === 'judge') {
        phase = 'reveal';
        tickBtn.disabled = crossBtn.disabled = true;
        api.correct(null, { silent: true });
        api.sfx('stamp');
        getState().stats.papersMarked++;
      }
      s.items.forEach((it, i) => s.answers[i] !== it.homeName && s.fixed.add(i));
      phase = 'reveal';
      markWrongAnimals();
      draw();
      hint.textContent = '🤖 Auto-graded';
      api.after(0.45, nextSheet);
    }

    const onResize = () => {
      resize();
      draw();
    };
    window.addEventListener('resize', onResize);
    render();
    return {
      destroy() {
        window.removeEventListener('resize', onResize);
        saveState();
      },
    };
  },
};
