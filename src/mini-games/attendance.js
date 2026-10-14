// Mini-game 8: Attendance Call.
// A class sits in front of the teacher. Tap every student's name in alphabetical order
// before the bell. A wrong tap costs a point (it does not end the round).
import { h, pick, shuffle } from '../core/ui.js';
import { studentNames, STUDENT_FACES, SHIRT_COLORS } from './data.js';
import { t, currentLang } from '../i18n/index.js';

/** First letter used for ordering. Names in a class never share it, so the order is unambiguous. */
const initial = (name) => (currentLang === 'bn' ? name.charAt(0) : name.charAt(0).toUpperCase());

/** Picks `n` names with different first letters, already sorted A→Z (অ→হ). */
function pickClass(n) {
  const byInitial = new Map();
  for (const name of shuffle(studentNames())) if (!byInitial.has(initial(name))) byInitial.set(initial(name), name);
  return shuffle([...byInitial.values()])
    .slice(0, n)
    .sort((a, b) => (initial(a) < initial(b) ? -1 : 1));
}

export default {
  id: 'attendance',

  start(api) {
    const d = api.difficulty;
    // One class (5-12 students) per round of up to 12 names.
    const classes = api.rounds > 12 ? 2 : 1;
    const sizes = classes === 2 ? [Math.ceil(api.rounds / 2), Math.floor(api.rounds / 2)] : [api.rounds];

    const register = h('div', { class: 'register' });
    const board = h(
      'div',
      { class: 'chalkboard roll-board' },
      h('div', { class: 'chalk-label' }, t('attendance.label')),
      h('div', { class: 'chalk-text' }, t('attendance.order')),
      register,
    );
    const room = h('div', { class: 'roll-room' });
    api.stage.append(h('div', { class: 'roll-scene' }, h('div', { class: 'board-row' }, h('div', { class: 'teacher-avatar' }, '👩‍🏫'), board), room));
    api.setControls(h('div', { class: 'roll-hint' }, t('attendance.hint')));

    let classIdx = 0;
    let order = []; // names A→Z for the current class
    let next = 0;
    let cards = new Map(); // name -> element
    let missStreak = 0;
    let locked = true;
    let marked = 0; // students marked present over the whole level

    // One bell for the whole level: generous early, tighter later.
    const perStudent = 2.8 - 1.1 * d;
    api.setTimer(Math.round(api.rounds * perStudent + 3 * classes), () => {
      locked = true;
      for (let i = marked; i < api.rounds; i++) api.wrong(null, { silent: true });
      api.toast(t('attendance.bell'), 'error');
      api.after(0.8, () => api.finish());
    });

    function seatClass() {
      order = pickClass(sizes[classIdx]);
      next = 0;
      missStreak = 0;
      register.replaceChildren();
      cards = new Map();
      const cols = order.length <= 6 ? 3 : 4;
      room.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      room.classList.toggle('dense', order.length > 8);
      room.replaceChildren(
        ...shuffle(order).map((name, i) => {
          const card = h(
            'button',
            { class: 'roll-student', onclick: () => tap(name) },
            h('div', { class: 'student-face' }, pick(STUDENT_FACES)),
            h('div', { class: 'student-body small', style: { background: SHIRT_COLORS[i % SHIRT_COLORS.length] } }),
            h('div', { class: 'roll-name' }, name),
          );
          cards.set(name, card);
          return card;
        }),
      );
      locked = false;
    }

    function tap(name) {
      if (locked || !api.alive) return;
      const card = cards.get(name);
      if (card.classList.contains('present')) return;
      if (name === order[next]) {
        card.classList.add('present');
        card.querySelector('.student-face').textContent = '🙋';
        register.appendChild(h('span', { class: 'register-name' }, `✔ ${name}`));
        next++;
        marked++;
        missStreak = 0;
        room.querySelectorAll('.roll-student.hint').forEach((c) => c.classList.remove('hint'));
        api.correct(card);
        if (next >= order.length) classDone();
      } else {
        api.wrong(card, { countsAsRound: false });
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
        // After two misses in a row, gently point at the right student.
        if (++missStreak >= 2) cards.get(order[next]).classList.add('hint');
      }
    }

    function classDone() {
      locked = true;
      classIdx++;
      if (classIdx >= classes) {
        api.clearTimer();
        api.after(0.7, () => api.finish());
      } else {
        api.toast(t('attendance.nextClass'), 'success');
        api.after(1.1, seatClass);
      }
    }

    seatClass();
    return { destroy() {} };
  },
};
