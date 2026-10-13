// Regenerates the Google Play store assets in docs/store-assets/.
//
//   npm run build                          # build the game into dist/ first
//   node docs/store-assets/generate.mjs    # needs Playwright (see README.md)
//
// Outputs:
//   app-icon-512.png            512x512  (full square; Google Play rounds it)
//   app-icon-512-rounded.png    512x512  (pre-rounded, transparent corners)
//   feature-graphic-1024x500.png 1024x500 (no alpha)
//   screenshot-1..4.png         1080x1920 (no alpha) - real game screens
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

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

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

// ---------------------------------------------------------------- icon + feature graphic
async function renderTemplate(file, query, w, h, target, transparent = false) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(tpl(file, query));
  await page.evaluate(() => document.fonts.ready);
  await sleep(300);
  await page.screenshot({ path: out(target), omitBackground: transparent });
  await page.close();
  console.log('✔', target);
}

await renderTemplate('icon.html', '', 512, 512, 'app-icon-512.png');
await renderTemplate('icon.html', '?rounded=1', 512, 512, 'app-icon-512-rounded.png', true);
await renderTemplate('feature.html', '', 1024, 500, 'feature-graphic-1024x500.png');

// ---------------------------------------------------------------- game screenshots
const server = await preview({ root, logLevel: 'silent', preview: { port: 4321, strictPort: false, host: '127.0.0.1' } });
const base = server.resolvedUrls.local[0];

function saveFor(level) {
  const stars = {};
  for (let l = 1; l < level; l++) stars[l] = l % 4 === 0 ? 2 : 3;
  return {
    teacherName: 'Ms. Lily',
    coins: 2450,
    unlockedLevel: level,
    stars,
    lastSeen: Date.now(),
    tutorialsSeen: { spelling: true, qa: true, match: true, cheating: true, stamp: true, security: true, library: true },
    settings: { sound: false, vibration: false },
  };
}

// 360x640 CSS px at 3x = exactly 1080x1920 PNG
async function openGame(level) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  await ctx.addInitScript((save) => {
    localStorage.setItem('mtl_save_v1', JSON.stringify({ ...save, lastSeen: Date.now() }));
  }, saveFor(level));
  await ctx.addInitScript(() => {
    window.__stageHud = (width, text, score) => {
      const apply = () => {
        document.querySelector('.hud-progress-fill').style.width = width;
        document.querySelector('.hud-progress-text').textContent = text;
        document.querySelector('.hud-score').textContent = score;
      };
      apply();
      setInterval(apply, 20);
    };
  });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForSelector('.home');
  await page.waitForSelector('#splash', { state: 'detached' });
  return { ctx, page };
}

async function startLevel(page) {
  await page.click('.play-btn', { force: true });
  await page.waitForSelector('.intro-card');
  await page.locator('button', { hasText: 'START' }).click({ force: true });
  await page.waitForSelector('.game-wrap');
}

async function shot(page, ctx, name) {
  await page.screenshot({ path: out(name) });
  await ctx.close();
  console.log('✔', name);
}

// 1) Title / home screen
{
  const { ctx, page } = await openGame(12);
  await sleep(1500);
  await shot(page, ctx, 'screenshot-1.png');
}

// 2) Spelling & Picture Check - "Grepes" crossed, Monkey and Rocket already ticked
{
  const { ctx, page } = await openGame(1);
  await startLevel(page);
  await page.waitForSelector('.paper');
  await sleep(900);
  await page.evaluate(() => {
    const paper = document.querySelector('.paper');
    paper.querySelector('.picture-frame').textContent = '🍇';
    paper.querySelector('.handwriting').textContent = 'Grepes';
    paper.querySelector('.paper-header .font-hand').textContent = 'Name: Amara';
    paper.querySelector('.paper-question').textContent = 'Q3. Write the name of this picture:';
    paper.querySelector('.stamp-slot').innerHTML = '<div class="red-mark cross">✘</div>';
    // graded papers tray (already marked: Monkey ✔, Rocket ✔)
    const pile = document.querySelector('.paper-pile');
    pile.remove();
    const tray = document.createElement('div');
    tray.style.cssText = 'position:absolute;top:8px;left:10px;right:10px;display:flex;gap:8px;justify-content:center;z-index:2';
    const mini = (emoji, word) =>
      `<div style="display:flex;align-items:center;gap:6px;background:#fffaf0;border-radius:10px;padding:4px 10px;box-shadow:0 3px 0 #e7dcc4,0 6px 10px rgba(0,0,0,.15);transform:rotate(${word === 'Monkey' ? -3 : 3}deg)">
        <span style="font-size:22px">${emoji}</span>
        <span style="font-family:'Patrick Hand',cursive;font-size:20px;color:#1e3a8a">${word}</span>
        <span style="color:#ef3b4d;font-weight:700;font-size:22px">✔</span></div>`;
    tray.innerHTML = mini('🐒', 'Monkey') + mini('🚀', 'Rocket');
    document.querySelector('.desk-scene').appendChild(tray);
    document.querySelector('.desk-scene').style.paddingTop = '46px';
    const [, cross] = document.querySelectorAll('.choice-btn');
    cross.classList.add('selected');
    const mark = [...document.querySelectorAll('.action-btn')].find((b) => b.textContent.includes('MARK'));
    mark.disabled = false;
    window.__stageHud('33%', '2 / 6', '✔ 2');
  });
  await sleep(500);
  await shot(page, ctx, 'screenshot-2.png');
}

// 3) Classroom Q&A - hands up, the right student selected, SESSION ready
{
  const { ctx, page } = await openGame(2);
  await startLevel(page);
  await page.waitForFunction(() => document.querySelectorAll('.student.raised').length >= 2, null, { timeout: 10000 });
  await sleep(800);
  await page.evaluate(() => {
    document.querySelector('.chalk-text').textContent = 'What color is a zebra?';
    const students = [...document.querySelectorAll('.student')];
    const answers = ['Pink', 'Green', 'Black & White'];
    students.forEach((s) => {
      s.classList.remove('raised', 'selected');
      s.querySelector('.hand').classList.add('hidden');
      s.querySelector('.bubble').classList.add('hidden');
    });
    students.slice(0, 3).forEach((s, i) => {
      s.classList.add('raised');
      s.querySelector('.hand').classList.remove('hidden');
      const b = s.querySelector('.bubble');
      b.classList.remove('hidden', 'faded');
      b.textContent = answers[i];
    });
    students[2].classList.add('selected');
    students[0].querySelector('.student-stars').textContent = '⭐';
    students[1].querySelector('.student-stars').textContent = '⭐⭐';
    const session = [...document.querySelectorAll('.action-btn')].find((b) => b.textContent.includes('SESSION'));
    session.disabled = false;
    window.__stageHud('40%', '2 / 5', '✔ 2');
  });
  await sleep(600);
  await shot(page, ctx, 'screenshot-3.png');
}

// 4) Exam hall - radar alert, cheater selected, CAUGHT ready
{
  const { ctx, page } = await openGame(11);
  await startLevel(page);
  await page.waitForSelector('.exam-student.cheating', { timeout: 15000 });
  await page.locator('.exam-student.cheating').click({ force: true });
  await sleep(450);
  await shot(page, ctx, 'screenshot-4.png');
}

await server.close();
await browser.close();
console.log('Done. Files are in', here);
