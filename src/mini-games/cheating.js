// Mini-game 3: Anti-Cheating Radar.
// Exam hall: a student peeks at a neighbour's paper. The radar circle shows the area.
// Tap the cheater, then press CAUGHT before they stop.
import { h, btn, pick, shuffle, rand } from '../core/ui.js';
import { getState, saveState } from '../core/storage.js';
import { STUDENT_NAMES, STUDENT_FACES, SHIRT_COLORS } from './data.js';

const DISTRACTIONS = [
  { face: '🥱', label: 'yawn' },
  { face: '🤔', label: 'think' },
  { face: '😴', label: 'doze' },
  { face: '🤧', label: 'sneeze' },
];

export default {
  id: 'cheating',
  howTo: [
    'Watch the exam hall carefully.',
    'When someone peeks 👀 at a neighbour\'s paper, the radar circle lights up near them.',
    'Tap the cheating student, then press CAUGHT!',
    'Don\'t accuse innocent students — yawning is not cheating!',
  ],

  start(api) {
    const d = api.difficulty;
    const cols = 3;
    const rows = d < 0.3 ? 2 : d < 0.7 ? 3 : 4;
    const count = cols * rows;
    const names = shuffle(STUDENT_NAMES);
    const faces = shuffle(STUDENT_FACES);

    const hall = h('div', { class: 'exam-hall', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } });
    const canvas = h('canvas', { class: 'radar-canvas' });
    const hallWrap = h('div', { class: 'exam-wrap' }, hall, canvas);
    const status = h('div', { class: 'exam-status' }, '🤫 Exam in progress… stay alert!');
    api.stage.append(h('div', { class: 'exam-scene' }, status, hallWrap));

    const students = Array.from({ length: count }, (_, i) => {
      const s = {
        i,
        name: names[i % names.length],
        face: faces[i % faces.length],
        col: i % cols,
        row: Math.floor(i / cols),
      };
      s.faceEl = h('div', { class: 'student-face' }, s.face);
      s.eyesEl = h('div', { class: 'peek-eyes hidden' }, '👀');
      s.el = h(
        'button',
        { class: 'exam-student', onclick: () => select(i) },
        s.eyesEl,
        s.faceEl,
        h('div', { class: 'student-body small', style: { background: SHIRT_COLORS[i % SHIRT_COLORS.length] } }),
        h('div', { class: 'exam-desk' }, h('div', { class: 'exam-paper' }, '📝')),
        h('div', { class: 'student-name' }, s.name),
      );
      hall.appendChild(s.el);
      return s;
    });

    const caughtBtn = btn('CAUGHT!', { color: 'red', icon: '🚨', size: 'xl', cls: 'action-btn', disabled: true, onClick: caught });
    api.setControls(caughtBtn);

    let selected = -1;
    let cheater = null; // { idx, dir, until }
    let roundsDone = 0;
    let resolving = false;
    let radarTarget = null; // {x, y, r}
    let sweep = 0;
    let idleTimers = [];

    function select(i) {
      if (resolving) return;
      selected = i;
      students.forEach((s, j) => s.el.classList.toggle('selected', j === i));
      caughtBtn.disabled = false;
      api.sfx('select');
    }

    function clearSelection() {
      selected = -1;
      students.forEach((s) => s.el.classList.remove('selected'));
      caughtBtn.disabled = true;
    }

    function neighbourDir(s) {
      const opts = [];
      if (s.col > 0) opts.push('left');
      if (s.col < cols - 1) opts.push('right');
      return pick(opts);
    }

    function scheduleRound() {
      if (!api.alive) return;
      resolving = false;
      status.textContent = '🤫 Exam in progress… stay alert!';
      status.className = 'exam-status';
      const wait = rand(1.2, 3.2 - d);
      // Innocent distractions on harder levels.
      if (d > 0.2) {
        const n = 1 + Math.round(d * 2);
        for (let k = 0; k < n; k++) {
          idleTimers.push(api.after(rand(0.2, wait + 1.5), distract));
        }
      }
      idleTimers.push(api.after(wait, startCheat));
    }

    function distract() {
      if (!api.alive || resolving) return;
      const s = pick(students.filter((x) => !cheater || x.i !== cheater.idx));
      if (!s || s.busy) return;
      s.busy = true;
      const dis = pick(DISTRACTIONS);
      s.faceEl.textContent = dis.face;
      s.el.classList.add('fidget');
      // On the hardest levels innocents lean too (without peeking eyes).
      if (d > 0.65) s.el.classList.add(Math.random() < 0.5 ? 'lean-left' : 'lean-right');
      api.after(rand(1.2, 2.2), () => {
        s.faceEl.textContent = s.face;
        s.el.classList.remove('fidget', 'lean-left', 'lean-right');
        s.busy = false;
      });
    }

    function startCheat() {
      if (!api.alive) return;
      const candidates = students.filter((s) => !s.busy);
      const s = pick(candidates.length ? candidates : students);
      s.faceEl.textContent = s.face;
      s.el.classList.remove('fidget', 'lean-left', 'lean-right');
      s.busy = true;
      const dir = neighbourDir(s);
      const windowSec = 3.4 - 1.7 * d;
      cheater = { idx: s.i, dir };
      s.el.classList.add('cheating', `lean-${dir}`);
      s.eyesEl.classList.remove('hidden');
      s.eyesEl.textContent = dir === 'left' ? '👀⬅' : '➡👀';
      api.sfx('beep');
      status.textContent = '📡 Radar alert! Someone is peeking!';
      status.className = 'exam-status alert';
      // Radar circle: exact on easy levels, wider & offset on hard levels.
      const rect = s.el.getBoundingClientRect();
      const wrapRect = hallWrap.getBoundingClientRect();
      const cx = rect.left - wrapRect.left + rect.width / 2;
      const cy = rect.top - wrapRect.top + rect.height / 2;
      const spread = rect.width * (0.15 + 0.6 * d);
      radarTarget = {
        x: cx + rand(-spread, spread),
        y: cy + rand(-spread * 0.6, spread * 0.6),
        r: rect.width * (0.6 + 0.9 * d),
        born: performance.now(),
      };
      cheater.timer = api.after(windowSec, () => {
        if (resolving) return;
        resolving = true;
        endCheat();
        status.textContent = `💨 ${s.name} got away with it!`;
        status.className = 'exam-status bad';
        api.wrong(s.el);
        finishRound();
      });
    }

    function endCheat() {
      if (!cheater) return;
      const s = students[cheater.idx];
      s.el.classList.remove('cheating', 'lean-left', 'lean-right');
      s.eyesEl.classList.add('hidden');
      s.busy = false;
      radarTarget = null;
    }

    function caught() {
      if (resolving || selected < 0) return;
      const target = students[selected];
      if (cheater && cheater.idx === selected) {
        resolving = true;
        api.cancel(cheater.timer);
        const s = target;
        endCheat();
        s.faceEl.textContent = '😱';
        s.el.appendChild(h('div', { class: 'caught-stamp' }, 'CAUGHT!'));
        status.textContent = `🚨 Caught ${s.name} red-handed!`;
        status.className = 'exam-status good';
        const st = getState();
        st.stats.cheatersCaught++;
        saveState();
        api.correct(s.el);
        api.after(1.2, () => {
          s.faceEl.textContent = s.face;
          s.el.querySelector('.caught-stamp')?.remove();
        });
        finishRound();
      } else {
        // False accusation!
        resolving = true;
        target.faceEl.textContent = '😢';
        status.textContent = `😢 ${target.name} was innocent!`;
        status.className = 'exam-status bad';
        api.wrong(target.el);
        if (cheater) {
          api.cancel(cheater.timer);
          endCheat();
        }
        api.after(1.1, () => (target.faceEl.textContent = target.face));
        finishRound();
      }
    }

    function finishRound() {
      cheater = null;
      clearSelection();
      idleTimers.forEach((id) => api.cancel(id));
      idleTimers = [];
      roundsDone++;
      api.after(1.3, () => {
        if (roundsDone >= api.rounds) api.finish();
        else scheduleRound();
      });
    }

    // ---- radar canvas
    const ctx = canvas.getContext('2d');
    function resize() {
      const r = hallWrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    const stopFrame = api.onFrame((dt) => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const hgt = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, hgt);
      sweep += dt * 2.2;
      const cx = w / 2;
      const cy = hgt / 2;
      const R = Math.hypot(w, hgt) / 2;
      // sweeping beam
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      const grad = ctx.createLinearGradient(0, 0, R, 0);
      grad.addColorStop(0, 'rgba(59,206,172,0.25)');
      grad.addColorStop(1, 'rgba(59,206,172,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -0.25, 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // rings
      ctx.strokeStyle = 'rgba(59,206,172,0.18)';
      ctx.lineWidth = 1.5;
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(cx, cy, (R / 3) * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      // alert circle
      if (radarTarget) {
        const t = (performance.now() - radarTarget.born) / 1000;
        const pulse = 1 + 0.08 * Math.sin(t * 8);
        ctx.strokeStyle = 'rgba(255,59,77,0.9)';
        ctx.fillStyle = 'rgba(255,59,77,0.12)';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.arc(radarTarget.x, radarTarget.y, radarTarget.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        const ripple = (t * 1.5) % 1;
        ctx.strokeStyle = `rgba(255,59,77,${1 - ripple})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(radarTarget.x, radarTarget.y, radarTarget.r * (0.4 + ripple), 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    api.after(0.6, scheduleRound);
    return {
      destroy() {
        stopFrame();
        window.removeEventListener('resize', resize);
      },
    };
  },
};
