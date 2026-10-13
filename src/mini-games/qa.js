// Mini-game 2: Classroom Interactive Q&A.
// A question is on the board, students raise hands with answers.
// Tap the student with the right answer, then press SESSION to reveal and award a star.
import { h, btn, shuffle } from '../core/ui.js';
import { qaQuestions, studentNames, STUDENT_FACES, SHIRT_COLORS } from './data.js';
import { t } from '../i18n/index.js';

export default {
  id: 'qa',

  start(api) {
    const d = api.difficulty;
    const classSize = 4 + Math.round(2 * d); // 4..6 students
    const questions = shuffle(qaQuestions()).slice(0, api.rounds);
    const names = shuffle(studentNames());
    const faces = shuffle(STUDENT_FACES);
    const students = Array.from({ length: classSize }, (_, i) => ({
      name: names[i],
      face: faces[i % faces.length],
      shirt: SHIRT_COLORS[i % SHIRT_COLORS.length],
      stars: 0,
    }));

    const board = h('div', { class: 'chalkboard' });
    const boardQ = h('div', { class: 'chalk-text' });
    const boardA = h('div', { class: 'chalk-answer' });
    board.append(h('div', { class: 'chalk-label' }, t('qa.label')), boardQ, boardA);

    const room = h('div', { class: 'classroom', style: { gridTemplateColumns: `repeat(${classSize > 4 ? 3 : 2}, 1fr)` } });
    const teacher = h('div', { class: 'teacher-avatar' }, '👩‍🏫');
    api.stage.append(h('div', { class: 'qa-scene' }, h('div', { class: 'board-row' }, teacher, board), room));

    students.forEach((st, i) => {
      st.el = h(
        'button',
        { class: 'student', onclick: () => select(i) },
        h('div', { class: 'bubble hidden' }),
        h('div', { class: 'hand hidden' }, '✋'),
        h('div', { class: 'student-face' }, st.face),
        h('div', { class: 'student-body', style: { background: st.shirt } }),
        h('div', { class: 'desk' }),
        h('div', { class: 'student-name' }, st.name),
        h('div', { class: 'student-stars' }),
      );
      room.appendChild(st.el);
    });

    const sessionBtn = btn(t('qa.session'), { color: 'purple', icon: '⭐', size: 'xl', cls: 'action-btn', disabled: true, onClick: session });
    api.setControls(sessionBtn);

    let round = 0;
    let selected = -1;
    let raised = []; // indices of students with raised hands
    let answers = {}; // studentIndex -> answer text
    let correctIdx = -1;
    let locked = true;
    let timeoutId = null;
    let fadeId = null;

    function select(i) {
      if (locked) return;
      if (!raised.includes(i)) {
        api.sfx('tap');
        students[i].el.classList.add('wiggle');
        setTimeout(() => students[i].el.classList.remove('wiggle'), 400);
        api.toast(t('qa.noHand', { name: students[i].name }));
        return;
      }
      selected = i;
      students.forEach((s, j) => s.el.classList.toggle('selected', j === i));
      sessionBtn.disabled = false;
      api.sfx('select');
    }

    function startRound() {
      if (!api.alive) return;
      const q = questions[round];
      boardQ.textContent = q.q;
      boardA.textContent = '';
      boardA.classList.remove('show');
      selected = -1;
      sessionBtn.disabled = true;
      students.forEach((s) => {
        s.el.classList.remove('selected', 'happy', 'sad', 'raised', 'reveal-correct');
        s.el.querySelector('.bubble').classList.add('hidden');
        s.el.querySelector('.hand').classList.add('hidden');
      });
      const nRaised = Math.min(classSize, 2 + Math.round(2 * d));
      raised = shuffle(students.map((_, i) => i)).slice(0, nRaised);
      const wrongs = shuffle(q.w).slice(0, nRaised - 1);
      const opts = shuffle([q.a, ...wrongs]);
      answers = {};
      raised.forEach((si, k) => {
        answers[si] = opts[k];
        if (opts[k] === q.a) correctIdx = si;
      });
      // Hands go up one by one.
      raised.forEach((si, k) => {
        api.after(0.25 + k * (0.35 - 0.15 * d), () => {
          const st = students[si];
          st.el.classList.add('raised');
          st.el.querySelector('.hand').classList.remove('hidden');
          const b = st.el.querySelector('.bubble');
          b.textContent = answers[si];
          b.classList.remove('hidden', 'faded');
          api.sfx('tap');
        });
      });
      api.after(0.3 + nRaised * 0.35, () => {
        locked = false;
      });
      // On harder levels the bubbles fade: remember who said what!
      if (d >= 0.45) {
        fadeId = api.after(5.5 - 2.5 * d, () => {
          raised.forEach((si) => {
            const b = students[si].el.querySelector('.bubble');
            b.classList.add('faded');
            b.textContent = '💭';
          });
        });
      }
      timeoutId = api.after(14 - 5 * d, () => {
        if (locked) return;
        locked = true;
        api.toast(t('qa.tooSlow'), 'error');
        api.wrong(null);
        reveal(false);
      });
    }

    function session() {
      if (locked || selected < 0) return;
      locked = true;
      api.cancel(timeoutId);
      api.cancel(fadeId);
      sessionBtn.disabled = true;
      const right = selected === correctIdx;
      const st = students[selected];
      if (right) {
        st.stars++;
        st.el.querySelector('.student-stars').textContent = '⭐'.repeat(Math.min(st.stars, 5));
        st.el.classList.add('happy');
        st.el.querySelector('.student-face').textContent = '😄';
        api.sfx('star');
        api.correct(st.el);
      } else {
        st.el.classList.add('sad');
        st.el.querySelector('.student-face').textContent = '😳';
        api.wrong(st.el);
      }
      reveal(right);
    }

    function reveal(right) {
      const q = questions[round];
      boardA.textContent = `✔ ${q.a}`;
      boardA.classList.add('show');
      // Show every bubble again and highlight the right student.
      raised.forEach((si) => {
        const b = students[si].el.querySelector('.bubble');
        b.textContent = answers[si];
        b.classList.remove('faded');
      });
      if (!right && correctIdx >= 0) students[correctIdx].el.classList.add('reveal-correct');
      api.after(right ? 1.3 : 2, () => {
        students.forEach((s) => (s.el.querySelector('.student-face').textContent = s.face));
        round++;
        if (round >= questions.length) api.finish();
        else startRound();
      });
    }

    startRound();
    return { destroy() {} };
  },
};

