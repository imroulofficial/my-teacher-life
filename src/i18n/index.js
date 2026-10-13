// Language manager: English / Bangla.
// Each language has its own string table AND its own game content (words, questions,
// books, names…), so Bangla players get native Bangla content, not a translation.
import en from './en.js';
import bn from './bn.js';

const TABLES = { en, bn };
export const LANGUAGES = [
  { id: 'bn', label: 'বাংলা' },
  { id: 'en', label: 'English' },
];
const STORAGE_KEY = 'mtl_lang';

function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return TABLES[v] ? v : null;
  } catch (e) {
    return null;
  }
}

export let currentLang = readSaved() || 'en';
const listeners = new Set();

function applyToDocument() {
  document.documentElement.lang = currentLang;
  document.documentElement.classList.toggle('lang-bn', currentLang === 'bn');
}
applyToDocument();

/** True until the player has picked a language once (first launch). */
export function hasChosenLanguage() {
  return readSaved() !== null;
}

export function setLanguage(lang) {
  if (!TABLES[lang]) return;
  const changed = lang !== currentLang;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    /* storage unavailable: language lasts for this session */
  }
  applyToDocument();
  if (changed) listeners.forEach((fn) => fn(lang));
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Converts 0-9 to Bangla digits when the language is Bangla. */
export function digits(value) {
  const s = String(value);
  return currentLang === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[d]) : s;
}

function lookup(table, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), table);
}

/**
 * Translated string for `key` (dot paths like "settings.sound").
 * `{name}` placeholders are filled from params; numbers use Bangla digits in Bangla.
 * Falls back to English, then to the key itself.
 */
export function t(key, params) {
  let s = lookup(TABLES[currentLang], key);
  if (s === undefined) s = lookup(en, key);
  if (s === undefined) return key;
  if (typeof s !== 'string' || !params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (params[k] === undefined ? m : typeof params[k] === 'number' ? digits(params[k]) : params[k]));
}

/** Language-specific game content (spelling words, questions, books, names…). */
export function content() {
  return TABLES[currentLang].content || en.content;
}
