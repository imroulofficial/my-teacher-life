// Tiny synthesized sound effects (no audio files needed, works offline).
import { getState } from './storage.js';

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.18, when = 0, slideTo = null) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const SOUNDS = {
  tap: () => tone(660, 0.06, 'triangle', 0.12),
  select: () => tone(520, 0.08, 'triangle', 0.14, 0, 780),
  correct: () => {
    tone(660, 0.1, 'triangle', 0.16);
    tone(990, 0.16, 'triangle', 0.16, 0.08);
  },
  wrong: () => {
    tone(220, 0.18, 'sawtooth', 0.1);
    tone(160, 0.22, 'sawtooth', 0.1, 0.1);
  },
  stamp: () => {
    tone(120, 0.12, 'square', 0.16, 0, 60);
    tone(90, 0.08, 'triangle', 0.12, 0.02);
  },
  coin: () => {
    tone(988, 0.07, 'square', 0.08);
    tone(1319, 0.14, 'square', 0.08, 0.07);
  },
  beep: () => tone(1200, 0.18, 'square', 0.08),
  alarm: () => {
    tone(880, 0.15, 'square', 0.09);
    tone(660, 0.15, 'square', 0.09, 0.16);
    tone(880, 0.15, 'square', 0.09, 0.32);
  },
  whoosh: () => tone(300, 0.2, 'sine', 0.08, 0, 1200),
  star: () => {
    tone(784, 0.1, 'triangle', 0.14);
    tone(1046, 0.1, 'triangle', 0.14, 0.1);
    tone(1568, 0.2, 'triangle', 0.14, 0.2);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.15, i * 0.11));
  },
  lose: () => {
    [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.13, i * 0.16));
  },
};

export function sfx(name) {
  try {
    if (!getState().settings.sound) return;
    const fn = SOUNDS[name];
    if (fn) fn();
  } catch (e) {
    /* audio is optional */
  }
}

export function vibrate(ms = 30) {
  try {
    if (getState().settings.vibration && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
    /* optional */
  }
}

// Browsers only allow audio after a user gesture: unlock on first tap.
export function unlockAudioOnFirstTouch() {
  const unlock = () => {
    ac();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
}
