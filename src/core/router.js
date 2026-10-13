// Minimal screen router. Each screen is { render(root, params) => cleanup?, onBack?() }.
import { $, clearChildren } from './ui.js';

const screens = {};
let current = null;
let currentName = null;
let currentParams = {};
let cleanup = null;

export function registerScreen(name, screen) {
  screens[name] = screen;
}

export function go(name, params = {}) {
  const screen = screens[name];
  if (!screen) throw new Error('Unknown screen ' + name);
  if (typeof cleanup === 'function') {
    try {
      cleanup();
    } catch (e) {
      console.error(e);
    }
  }
  cleanup = null;
  const root = $('#app');
  clearChildren(root);
  root.scrollTop = 0;
  current = screen;
  currentName = name;
  currentParams = params;
  const container = document.createElement('div');
  container.className = `screen screen-${name} screen-enter`;
  root.appendChild(container);
  cleanup = screen.render(container, params) || null;
}

/** Android back button. Returns true when handled. */
export function handleBack() {
  if (current && typeof current.onBack === 'function') return current.onBack();
  return false;
}

export function currentScreen() {
  return currentName;
}

/** Re-renders the current screen (e.g. after a language change). */
export function refresh() {
  if (currentName) go(currentName, currentParams);
}
