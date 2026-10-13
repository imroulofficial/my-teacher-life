// Shared DOM helpers: element builder, modals, toasts, confetti, coin HUD.
import { sfx } from './audio.js';
import { t, digits } from '../i18n/index.js';

/**
 * Tiny element builder.
 * h('div', { class: 'x', onclick: fn }, 'text', childEl)
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function fmt(n) {
  n = Math.floor(n);
  let out;
  if (n >= 1e9) out = (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  else if (n >= 1e6) out = (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  else if (n >= 1e4) out = (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  else out = n.toLocaleString('en-US');
  return digits(out); // Bangla digits in Bangla
}

export function fmtDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hrs > 0) return t('common.durationHM', { h: hrs, m: min });
  return t('common.durationM', { m: Math.max(1, min) });
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** A big, chunky 3D-looking button. */
export function btn(label, { color = 'green', size = 'md', onClick, icon, cls = '', disabled = false, id } = {}) {
  const b = h(
    'button',
    { class: `btn3d btn-${color} btn-${size} ${cls}`, id, disabled: disabled || undefined },
    icon ? h('span', { class: 'btn-icon' }, icon) : null,
    h('span', { class: 'btn-label' }, label),
  );
  if (onClick)
    b.addEventListener('click', (e) => {
      if (b.disabled) return;
      sfx('tap');
      onClick(e);
    });
  return b;
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
let modalStack = [];

export function modal({ title, body, buttons = [], dismissable = true, cls = '' }) {
  const layer = $('#modal-layer');
  const backdrop = h('div', { class: 'modal-backdrop' });
  const card = h(
    'div',
    { class: `modal-card pop-in ${cls}` },
    title ? h('h2', { class: 'modal-title' }, title) : null,
    h('div', { class: 'modal-body' }, body),
    h('div', { class: 'modal-buttons' }),
  );
  const wrap = h('div', { class: 'modal-wrap' }, backdrop, card);
  const handle = {
    el: wrap,
    dismissable,
    close() {
      if (!wrap.isConnected) return;
      wrap.classList.add('fade-out');
      modalStack = modalStack.filter((m) => m !== handle);
      setTimeout(() => wrap.remove(), 180);
    },
  };
  const btnRow = card.querySelector('.modal-buttons');
  for (const b of buttons) {
    btnRow.appendChild(
      btn(b.label, {
        color: b.color || 'blue',
        icon: b.icon,
        size: b.size || 'md',
        cls: b.cls,
        onClick: () => {
          const keepOpen = b.onClick ? b.onClick(handle) : false;
          if (keepOpen !== true) handle.close();
        },
      }),
    );
  }
  if (dismissable) backdrop.addEventListener('click', () => handle.close());
  layer.appendChild(wrap);
  modalStack.push(handle);
  return handle;
}

/** Closes the top modal. Returns true if a modal was closed. */
export function closeTopModal() {
  const top = modalStack[modalStack.length - 1];
  if (top && top.dismissable) {
    top.close();
    return true;
  }
  return !!top; // a non-dismissable modal swallows the back button
}

export function confirmModal(title, text, okLabel = t('common.ok'), okColor = 'red') {
  return new Promise((resolve) => {
    let answered = false;
    const m = modal({
      title,
      body: h('p', { class: 'text-center text-lg' }, text),
      buttons: [
        { label: t('common.cancel'), color: 'gray', onClick: () => ((answered = true), resolve(false)) },
        { label: okLabel, color: okColor, onClick: () => ((answered = true), resolve(true)) },
      ],
    });
    const origClose = m.close;
    m.close = () => {
      if (!answered) resolve(false);
      origClose();
    };
  });
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
export function toast(text, type = 'info', ms = 1800) {
  const layer = $('#toast-layer');
  const t = h('div', { class: `toast toast-${type}` }, text);
  layer.appendChild(t);
  setTimeout(() => t.classList.add('fade-out'), ms);
  setTimeout(() => t.remove(), ms + 300);
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
export function confetti(count = 60) {
  const layer = $('#fx-layer');
  const colors = ['#ff4d6d', '#ffd23f', '#3bceac', '#4d96ff', '#9b5de5', '#ff9f1c'];
  for (let i = 0; i < count; i++) {
    const p = h('div', { class: 'confetti' });
    p.style.left = rand(0, 100) + 'vw';
    p.style.background = pick(colors);
    p.style.animationDuration = rand(1.4, 2.8) + 's';
    p.style.animationDelay = rand(0, 0.4) + 's';
    p.style.transform = `rotate(${rand(0, 360)}deg)`;
    p.style.width = rand(6, 12) + 'px';
    p.style.height = rand(10, 18) + 'px';
    layer.appendChild(p);
    setTimeout(() => p.remove(), 3500);
  }
}

/** Floating "+10" style text at a screen position. */
export function floatText(text, x, y, color = '#ffd23f') {
  const layer = $('#fx-layer');
  const t = h('div', { class: 'float-text' }, text);
  t.style.left = x + 'px';
  t.style.top = y + 'px';
  t.style.color = color;
  layer.appendChild(t);
  setTimeout(() => t.remove(), 1100);
}

export function floatAtEl(el, text, color) {
  const r = el.getBoundingClientRect();
  floatText(text, r.left + r.width / 2, r.top + r.height / 3, color);
}

/** Big centered feedback mark (✔ / ✘). */
export function flashMark(ok) {
  const layer = $('#fx-layer');
  const m = h('div', { class: `flash-mark ${ok ? 'ok' : 'bad'}` }, ok ? '✔' : '✘');
  layer.appendChild(m);
  setTimeout(() => m.remove(), 650);
}

export function shake(el) {
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

/** Show the full-screen "ad is loading" blocker. */
export function adLoadingOverlay(show) {
  let o = $('#ad-loading');
  if (show) {
    if (!o) {
      o = h(
        'div',
        { id: 'ad-loading', class: 'ad-loading' },
        h('div', { class: 'ad-spinner' }),
        h('div', { class: 'mt-3 text-white text-xl font-bold' }, t('ads.loading')),
      );
      document.body.appendChild(o);
    }
  } else if (o) o.remove();
}

export function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
