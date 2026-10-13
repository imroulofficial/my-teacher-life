// Unique Golden Stamp designs ("flourishes") unlocked with the Golden Stamp reward.
import { getState, saveState } from './storage.js';
import { t } from '../i18n/index.js';

export const STAMP_DESIGNS = [
  { id: 'classic', get name() { return t(`collection.designs.${this.id}`); }, icon: '🖍️', color: '#e11d48', free: true },
  { id: 'crown', get name() { return t(`collection.designs.${this.id}`); }, icon: '👑', color: '#d97706' },
  { id: 'rainbow', get name() { return t(`collection.designs.${this.id}`); }, icon: '🌈', color: '#7c3aed' },
  { id: 'rocket', get name() { return t(`collection.designs.${this.id}`); }, icon: '🚀', color: '#2563eb' },
  { id: 'dragon', get name() { return t(`collection.designs.${this.id}`); }, icon: '🐉', color: '#16a34a' },
  { id: 'unicorn', get name() { return t(`collection.designs.${this.id}`); }, icon: '🦄', color: '#db2777' },
  { id: 'star', get name() { return t(`collection.designs.${this.id}`); }, icon: '🌟', color: '#ca8a04' },
  { id: 'heart', get name() { return t(`collection.designs.${this.id}`); }, icon: '💖', color: '#e11d48' },
  { id: 'trophy', get name() { return t(`collection.designs.${this.id}`); }, icon: '🏆', color: '#b45309' },
  { id: 'diamond', get name() { return t(`collection.designs.${this.id}`); }, icon: '💎', color: '#0891b2' },
  { id: 'lightning', get name() { return t(`collection.designs.${this.id}`); }, icon: '⚡', color: '#ca8a04' },
];

export function isUnlocked(id) {
  const d = STAMP_DESIGNS.find((x) => x.id === id);
  return !!d && (d.free || getState().goldenStamps.includes(id));
}

export function activeDesign() {
  const s = getState();
  return STAMP_DESIGNS.find((d) => d.id === s.activeStamp && isUnlocked(d.id)) || STAMP_DESIGNS[0];
}

export function setActiveDesign(id) {
  if (!isUnlocked(id)) return false;
  getState().activeStamp = id;
  saveState();
  return true;
}

/** Unlocks a random locked design. Returns it, or null if all are owned. */
export function unlockRandomDesign() {
  const locked = STAMP_DESIGNS.filter((d) => !isUnlocked(d.id));
  if (!locked.length) return null;
  const d = locked[Math.floor(Math.random() * locked.length)];
  const s = getState();
  s.goldenStamps.push(d.id);
  s.activeStamp = d.id;
  saveState();
  return d;
}
