// Renders the app icon (templates/icon.html, vector) at every size needed:
//   docs/store-assets/app-icon-512.png          Play Store icon (full square, with title ribbon)
//   docs/store-assets/app-icon-512-rounded.png  rounded copy for web/social media
//   store-assets/play_store_icon_512.png        same as app-icon-512.png
//   android/app/src/main/res/mipmap-*/ic_launcher.png             legacy launcher icon (rounded square)
//   android/app/src/main/res/mipmap-*/ic_launcher_round.png       legacy round launcher icon
//   android/app/src/main/res/mipmap-*/ic_launcher_foreground.png  adaptive icon foreground (Android 8+)
//   android/app/src/main/res/mipmap-*/ic_launcher_background.png  adaptive icon background (Android 8+)
//
//   node docs/store-assets/generate-icons.mjs     (needs Playwright, see README.md)
//
// Each size is rendered directly from the vector design (not downscaled), so small sizes stay sharp.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const require = createRequire(import.meta.url);

function loadPlaywright() {
  for (const c of [process.env.PLAYWRIGHT_MODULE, 'playwright', 'playwright-core', '@playwright/test'].filter(Boolean)) {
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
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const template = pathToFileURL(path.join(here, 'templates/icon.html')).href;

async function render(query, size, target, transparent = false) {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: size / 512 });
  await page.goto(template + query);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, omitBackground: transparent });
  await page.close();
  console.log(`✔ ${size}x${size}  ${path.relative(root, target)}`);
}

// Store icons
await render('', 512, path.join(here, 'app-icon-512.png'));
await render('?shape=rounded', 512, path.join(here, 'app-icon-512-rounded.png'), true);
fs.copyFileSync(path.join(here, 'app-icon-512.png'), path.join(root, 'store-assets/play_store_icon_512.png'));
console.log('✔ 512x512  store-assets/play_store_icon_512.png');

// Android launcher icons
const res = path.join(root, 'android/app/src/main/res');
const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [dpi, size] of Object.entries(densities)) {
  const dir = path.join(res, `mipmap-${dpi}`);
  const adaptive = Math.round((size * 108) / 48); // adaptive layers are 108dp
  await render('?text=0&minimal=1&shape=rounded', size, path.join(dir, 'ic_launcher.png'), true);
  await render('?text=0&minimal=1&shape=circle', size, path.join(dir, 'ic_launcher_round.png'), true);
  await render('?layer=fg', adaptive, path.join(dir, 'ic_launcher_foreground.png'), true);
  await render('?layer=bg', adaptive, path.join(dir, 'ic_launcher_background.png'));
}

await browser.close();
console.log('Done.');
