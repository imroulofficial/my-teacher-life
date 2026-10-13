// Shared content for the mini-games.
// Language-specific content (words, questions, books, names…) lives in src/i18n/en.js and bn.js.
import { content } from '../i18n/index.js';

export const studentNames = () => content().studentNames;
export const spellingWords = () => content().spellingWords;
export const qaQuestions = () => content().qaQuestions;
export const animalHomes = () => content().animalHomes;
export const librarySubjects = () => content().librarySubjects;
export const bannedItems = () => content().bannedItems;
export const testSubjects = () => content().testSubjects;

// Base faces for students (skin tones add variety).
export const STUDENT_FACES = ['🧒', '👧', '👦', '🧒🏽', '👧🏾', '👦🏻', '🧒🏿', '👧🏼', '👦🏽', '🧒🏻', '👧🏽', '👦🏿'];

export const SHIRT_COLORS = ['#ff6b6b', '#4d96ff', '#3bceac', '#ffd23f', '#9b5de5', '#ff9f1c', '#f15bb5', '#00bbf9'];

// Security scan items.
export const ALLOWED_ITEMS = ['📚', '✏️', '🍎', '🧃', '📏', '🖍️', '🥪', '⚽', '🔑', '🧮', '📓', '🍌', '🧢', '🧸', '🎧', '🖊️', '🍪', '💧'];
// Items that set off the metal detector (keys, rulers… and some banned items).
export const METAL_ITEMS = new Set(['🔑', '📏', '🔫', '🎮', '📱', '🎧']);
export const COVER_ITEMS = ['👕', '🧥', '🧦', '🧣'];
