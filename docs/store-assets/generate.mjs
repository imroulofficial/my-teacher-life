// Regenerates the Google Play store assets in docs/store-assets/.
//
//   npm run build                          # build the game into dist/ first
//   node docs/store-assets/generate.mjs    # needs Playwright (see README.md)
//
// Outputs (all PNG without alpha):
//   badge-120levels.png          128x128   "120 Levels" medal (also used on the feature graphic)
//   feature-graphic-1024x500.png 1024x500
//   screenshot-1..6.png          1080x1920 caption strip (240 px) + real game capture (1080x1680)
//   (app icons: run generate-icons.mjs)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const require = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core', '@playwright/test'].filter(Boolean);
  for (const c of candidates) {
    try {
      return require(c);
    } catch {
      /* try next */
    }
  }
  console.error('Playwright not found. Install it with:  npm i --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const { chromium } = loadPlaywright();
const { preview } = await import(pathToFileURL(path.join(root, 'node_modules/vite/dist/node/index.js')).href);

if (!fs.existsSync(path.join(root, 'dist/index.html'))) {
  console.error('dist/ is missing. Run "npm run build" first.');
  process.exit(1);
}

const out = (name) => path.join(here, name);
const tpl = (name, query = '') => pathToFileURL(path.join(here, 'templates', name)).href + query;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mtl-shots-'));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// ---------------------------------------------------------------- badge + feature graphic
async function renderTemplate(file, query, w, h, target, scale = 1) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.goto(tpl(file, query));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await sleep(300);
  await page.screenshot({ path: target });
  await page.close();
  console.log('✔', path.basename(target));
}

await renderTemplate('badge.html', '', 128, 128, out('badge-120levels.png'));
await renderTemplate('feature.html', '', 1024, 500, out('feature-graphic-1024x500.png'));

// ---------------------------------------------------------------- game screenshots
const server = await preview({ root, logLevel: 'silent', preview: { port: 4321, strictPort: false, host: '127.0.0.1' } });
const base = server.resolvedUrls.local[0];

const ALL_GAMES = ['spelling', 'qa', 'match', 'cheating', 'stamp', 'security', 'library', 'attendance', 'math', 'homework', 'boss'];
const BADGES = ['chapter1', 'perfect', 'streak7', 'coins10k', 'matchMaster', 'boss5', 'bilingual', 'daily10', 'speedy', 'chapter5', 'chapter8', 'chapter12'];

/** A believable save at `level`: earlier levels starred, tutorials and chapter cards already seen. */
function saveFor(level, { badges = 0, coins = 2450 } = {}) {
  const stars = {};
  for (let l = 1; l < level; l++) stars[l] = l % 4 === 0 ? 2 : 3;
  const bossWins = {};
  for (const b of [60, 70, 80, 90, 100, 110, 120]) if (b < level) bossWins[b] = true;
  const now = Date.now();
  return {
    teacherName: 'Ms. Lily',
    coins,
    totalCoinsEarned: coins * 4,
    unlockedLevel: level,
    stars,
    bossWins,
    tutorialsSeen: Object.fromEntries(ALL_GAMES.map((g) => [g, true])),
    chapterIntrosReady: true,
    chaptersSeen: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, true])),
    achievements: Object.fromEntries(BADGES.slice(0, badges).map((id, i) => [id, now - i * 86400000])),
    stats: { levelsPlayed: level + 9, dailyBonuses: 6, perfectLevels: 4, fastestWin: 12.6 },
    langsPlayed: ['en', 'bn'],
    settings: { sound: false, vibration: false },
  };
}

// The game area is 360x560 CSS px at 3x = 1080x1680 px; the caption strip adds the top 240 px.
async function openGame({ lang = 'en', level, streak = 5, badges = 0, coins }) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 560 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript(
    ({ lang, save, streak }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('mtl_lang', lang);
      localStorage.setItem('mtl_save_v1', JSON.stringify({ ...save, lastSeen: Date.now() }));
      localStorage.setItem('mtl_streak', JSON.stringify({ count: streak, lastPlayedDate: today }));
      localStorage.setItem('mtl_last_daily_bonus', JSON.stringify(today)); // no bonus pop-up in the shots
      localStorage.setItem('mtl_last_milestone', '100000');
    },
    { lang, save: saveFor(level, { badges, coins }), streak },
  );
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForSelector('.home');
  await page.waitForSelector('#splash', { state: 'detached' });
  await sleep(600);
  return { ctx, page };
}

/** Home -> PLAY -> level intro (-> START). */
async function openLevel(page, start = true) {
  await page.click('.play-btn', { force: true });
  await page.waitForSelector('.intro-card');
  await sleep(500);
  if (!start) return;
  await page.locator('.intro-card .btn3d').last().click({ force: true });
  await page.waitForSelector('.game-wrap');
}

async function capture(page, ctx, name, caption) {
  const raw = path.join(tmp, name);
  await page.screenshot({ path: raw });
  await ctx.close();
  await renderTemplate('frame.html', '#' + encodeURIComponent(JSON.stringify({ ...caption, shot: pathToFileURL(raw).href })), 360, 640, out(name), 3);
}

// 1) Home: PLAY button, 🔥 streak chip, trophy count
{
  const { ctx, page } = await openGame({ level: 34, streak: 5, badges: 5 });
  await capture(page, ctx, 'screenshot-1.png', { badge: true, title: '120 Levels • 10 Mini-Games', sub: 'Grade papers, run lessons and grow your own school' });
}

// 2) Attendance Call (new): a class of 12, the first names already marked present
{
  const { ctx, page } = await openGame({ level: 66 });
  await openLevel(page);
  await page.waitForSelector('.roll-student');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const left = [...document.querySelectorAll('.roll-student:not(.present)')];
      const first = (el) => el.querySelector('.roll-name').textContent.charAt(0).toUpperCase();
      left.sort((a, b) => (first(a) < first(b) ? -1 : 1))[0].click();
    });
    await sleep(450);
  }
  await sleep(900);
  await capture(page, ctx, 'screenshot-2.png', { isNew: true, title: 'Attendance Call', sub: 'Call the roll from A to Z before the bell rings' });
}

// 3) Blackboard Math (new) in Bangla, with Bangla digits on the board and the answers
{
  const { ctx, page } = await openGame({ lang: 'bn', level: 92 });
  await openLevel(page);
  await page.waitForSelector('.math-opt');
  // Answer correctly until a × or ÷ sum is on the board (at most a few problems).
  for (let i = 0; i < 6; i++) {
    await sleep(500);
    const text = await page.evaluate(() => document.querySelector('.math-problem').textContent);
    if (/[×÷]/.test(text)) break;
    await page.evaluate(() => {
      const en = (s) => s.replace(/[০-৯]/g, (d) => '০১২৩৪৫৬৭৮৯'.indexOf(d));
      const [a, op, b] = en(document.querySelector('.math-problem').textContent).replace(/\s/g, '').match(/^(\d+)([+−×÷])(\d+)/).slice(1);
      const ans = { '+': +a + +b, '−': a - b, '×': a * b, '÷': a / b }[op];
      [...document.querySelectorAll('.math-opt')].find((o) => +en(o.textContent.trim()) === ans).click();
    });
    await sleep(1200);
  }
  await sleep(400);
  await capture(page, ctx, 'screenshot-3.png', { isNew: true, title: 'Blackboard Math', sub: 'বাংলা সংখ্যায় অঙ্ক: যোগ, বিয়োগ, গুণ, ভাগ, ভগ্নাংশ', bnSub: true });
}

// 4) Boss level 60: the three lessons played back to back
{
  const { ctx, page } = await openGame({ level: 60 });
  await openLevel(page, false);
  await capture(page, ctx, 'screenshot-4.png', { icon: '👑', title: 'Boss Levels', sub: '3 lessons in a row. Win them all for 5× coins!' });
}

// 5) Achievements: 7 of 12 badges unlocked
{
  const { ctx, page } = await openGame({ level: 88, badges: 7, coins: 8450 });
  await page.click('.trophy-btn', { force: true });
  await page.waitForSelector('.badge-grid');
  await sleep(1400);
  await capture(page, ctx, 'screenshot-5.png', { icon: '🏆', title: '12 Achievements', sub: 'Streaks, perfect scores, boss wins and more' });
}

// 6) Bangla home screen (golden 🔥 streak)
{
  const { ctx, page } = await openGame({ lang: 'bn', level: 47, streak: 8, badges: 6 });
  await capture(page, ctx, 'screenshot-6.png', { icon: '🇧🇩', title: 'বাংলা সমর্থিত', bnTitle: true, sub: 'পুরো খেলা বাংলায়, নিজের ভাষায় পড়াও!', bnSub: true });
}

await server.close();
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('Done. Files are in', here);
