// Mini-game 6: Library Book Sorting.
// Drag books from the cart onto the right subject shelf, then press PLACE to check.
// Rewarded "Library Rush" instantly sorts everything with an animation when there are lots of books.
import { h, btn, shuffle } from '../core/ui.js';
import { AD_UNITS } from '../core/config.js';
import { getState, saveState } from '../core/storage.js';
import { librarySubjects } from './data.js';
import { t } from '../i18n/index.js';

const RUSH_THRESHOLD = 10; // "too many books" -> offer Library Rush

export default {
  id: 'library',

  start(api) {
    const d = api.difficulty;
    const subjects = librarySubjects().slice(0, d < 0.25 ? 3 : d < 0.6 ? 4 : 5);
    const showColor = d < 0.35;
    const showIcon = d < 0.7;

    // Build books with unique titles.
    const pool = shuffle(subjects.flatMap((s) => s.titles.map((t) => ({ subject: s, title: t }))));
    const books = pool.slice(0, api.rounds).map((b, i) => ({ ...b, id: i, missed: false, state: 'cart' }));

    const shelvesEl = h('div', { class: 'shelves' });
    const cart = h('div', { class: 'book-cart' });
    const counter = h('div', { class: 'cart-label' });
    api.stage.append(h('div', { class: 'library-scene' }, shelvesEl, h('div', { class: 'cart-wrap' }, counter, cart)));

    const shelves = subjects.map((s) => {
      const slot = h('div', { class: 'shelf-books' });
      const el = h(
        'div',
        { class: 'shelf', style: { '--shelf': s.color }, dataset: { subject: s.id } },
        h('div', { class: 'shelf-label' }, h('span', { class: 'text-2xl' }, s.icon), h('span', {}, s.name)),
        slot,
      );
      el.addEventListener('click', () => {
        if (selectedBook) placeOnShelf(selectedBook, s.id);
      });
      shelvesEl.appendChild(el);
      return { subject: s, el, slot };
    });

    const placeBtn = btn(t('library.place'), { color: 'blue', icon: '📥', size: 'xl', cls: 'action-btn', disabled: true, onClick: place });
    api.setControls(placeBtn);

    const rush = api.addPower({
      label: t('library.rush'),
      icon: '📚',
      adUnit: AD_UNITS.LIBRARY_RUSH,
      onReward: libraryRush,
      hidden: true,
    });

    let selectedBook = null;
    let busy = false;

    function bookEl(b) {
      const el = h(
        'div',
        {
          class: 'book',
          style: { background: showColor ? b.subject.color : ['#8d6e63', '#a1887f', '#795548', '#6d4c41'][b.id % 4] },
        },
        showIcon ? h('span', { class: 'book-icon' }, b.subject.icon) : null,
        h('span', { class: 'book-title' }, b.title),
      );
      b.el = el;
      attachDrag(b);
      return el;
    }

    books.forEach((b) => cart.appendChild(bookEl(b)));

    function refresh() {
      const inCart = books.filter((b) => b.state === 'cart').length;
      const pending = books.filter((b) => b.state === 'pending').length;
      const remaining = books.filter((b) => b.state !== 'done').length;
      counter.textContent = inCart ? t(inCart > 1 ? 'library.cartMany' : 'library.cartOne', { n: inCart }) : pending ? t('library.pressPlace') : '';
      placeBtn.disabled = pending === 0 || busy;
      placeBtn.classList.toggle('pulse', inCart === 0 && pending > 0);
      if (remaining >= RUSH_THRESHOLD && !rush.used) rush.show();
      else if (!rush.used) rush.hide();
    }

    function select(b) {
      if (busy) return;
      if (b.state === 'pending') {
        // Tap a book on a shelf to take it back.
        moveToCart(b);
        return;
      }
      selectedBook = selectedBook === b ? null : b;
      books.forEach((x) => x.el.classList.toggle('selected', x === selectedBook));
      shelvesEl.classList.toggle('awaiting', !!selectedBook);
      api.sfx('select');
    }

    function moveToCart(b) {
      b.state = 'cart';
      b.shelf = null;
      b.el.classList.remove('pending', 'selected');
      cart.appendChild(b.el);
      api.sfx('tap');
      refresh();
    }

    function placeOnShelf(b, subjectId) {
      if (busy || b.state === 'done') return;
      const shelf = shelves.find((s) => s.subject.id === subjectId);
      b.state = 'pending';
      b.shelf = subjectId;
      b.el.classList.remove('selected');
      b.el.classList.add('pending');
      shelf.slot.appendChild(b.el);
      selectedBook = null;
      shelvesEl.classList.remove('awaiting');
      api.sfx('whoosh');
      refresh();
    }

    function place() {
      if (busy) return;
      const pending = books.filter((b) => b.state === 'pending');
      if (!pending.length) return;
      busy = true;
      let anyWrong = false;
      pending.forEach((b) => {
        if (b.shelf === b.subject.id) {
          b.state = 'done';
          b.el.classList.remove('pending');
          b.el.classList.add('locked');
          if (b.missed) api.advance();
          else api.correct(null, { silent: true });
        } else {
          anyWrong = true;
          b.missed = true;
          b.el.classList.add('wrong');
          api.wrong(null, { countsAsRound: false, silent: true });
        }
      });
      api.sfx(anyWrong ? 'wrong' : 'correct');
      const s = getState();
      s.stats.booksSorted += pending.filter((b) => b.state === 'done').length;
      saveState();
      api.after(anyWrong ? 0.8 : 0.2, () => {
        pending
          .filter((b) => b.state === 'pending')
          .forEach((b) => {
            b.el.classList.remove('wrong');
            moveToCart(b);
          });
        busy = false;
        refresh();
        checkDone();
      });
    }

    function checkDone() {
      if (books.every((b) => b.state === 'done')) {
        api.after(0.5, () => api.finish());
      }
    }

    // ---- drag & drop (touch + mouse)
    function attachDrag(b) {
      const el = b.el;
      let start = null;
      let ghost = null;
      el.addEventListener('pointerdown', (e) => {
        if (busy || b.state === 'done') return;
        start = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', (e) => {
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (!ghost && Math.hypot(dx, dy) > 8) {
          ghost = el.cloneNode(true);
          ghost.classList.add('book-ghost');
          document.body.appendChild(ghost);
          el.classList.add('dragging');
        }
        if (ghost) {
          ghost.style.left = e.clientX + 'px';
          ghost.style.top = e.clientY + 'px';
          const under = shelfAt(e.clientX, e.clientY);
          shelves.forEach((s) => s.el.classList.toggle('drop-hover', s.el === under));
        }
      });
      const end = (e) => {
        if (!start) return;
        const wasDrag = !!ghost;
        if (ghost) {
          ghost.remove();
          ghost = null;
          el.classList.remove('dragging');
          shelves.forEach((s) => s.el.classList.remove('drop-hover'));
          const under = shelfAt(e.clientX, e.clientY);
          if (under) placeOnShelf(b, under.dataset.subject);
        }
        start = null;
        if (!wasDrag && e.type === 'pointerup') select(b);
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      el.addEventListener('click', (e) => e.stopPropagation());
    }

    function shelfAt(x, y) {
      for (const s of shelves) {
        const r = s.el.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s.el;
      }
      return null;
    }

    // ---- Rewarded Library Rush: animated auto-sort of everything left
    function libraryRush() {
      busy = true;
      selectedBook = null;
      rush.hide();
      api.toast(t('library.rushToast'), 'success');
      const todo = books.filter((b) => b.state !== 'done');
      todo.forEach((b, k) => {
        api.after(k * 0.12, () => {
          const shelf = shelves.find((s) => s.subject.id === b.subject.id);
          const from = b.el.getBoundingClientRect();
          const to = shelf.slot.getBoundingClientRect();
          const flyer = b.el.cloneNode(true);
          flyer.classList.add('book-fly');
          Object.assign(flyer.style, { left: from.left + 'px', top: from.top + 'px', width: from.width + 'px', height: from.height + 'px' });
          document.body.appendChild(flyer);
          b.el.style.visibility = 'hidden';
          requestAnimationFrame(() => {
            flyer.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height / 2 - from.top - from.height / 2}px) rotate(360deg) scale(0.8)`;
          });
          api.sfx('whoosh');
          setTimeout(() => {
            flyer.remove();
            b.el.style.visibility = '';
            b.el.classList.remove('pending', 'selected', 'wrong');
            b.el.classList.add('locked');
            shelf.slot.appendChild(b.el);
            b.state = 'done';
            if (b.missed) api.advance();
            else api.correct(null, { silent: true });
            getState().stats.booksSorted++;
          }, 520);
        });
      });
      api.after(todo.length * 0.12 + 0.9, () => {
        saveState();
        api.sfx('win');
        busy = false;
        refresh();
        checkDone();
      });
    }

    refresh();
    return {
      destroy() {
        document.querySelectorAll('.book-ghost, .book-fly').forEach((g) => g.remove());
      },
    };
  },
};

