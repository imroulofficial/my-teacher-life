# Google Play store assets: My Teacher Life

| File | Size | Use in Play Console |
|------|------|---------------------|
| `app-icon-512.png` | 512 × 512 | **Store listing → App icon**. A full square; Google Play rounds the corners itself. |
| `app-icon-512-rounded.png` | 512 × 512 | Pre-rounded copy with transparent corners, for websites and social media. Don't upload this one to Play. |
| `feature-graphic-1024x500.png` | 1024 × 500 | **Store listing → Feature graphic** (24-bit PNG, no alpha). |
| `screenshot-1.png` | 1080 × 1920 | Phone screenshot: title / home screen with the PLAY button |
| `screenshot-2.png` | 1080 × 1920 | Phone screenshot: Spelling & Picture Check ("Grepes" crossed, Monkey and Rocket ticked, MARK button) |
| `screenshot-3.png` | 1080 × 1920 | Phone screenshot: Classroom Q&A (hands raised, SESSION button) |
| `screenshot-4.png` | 1080 × 1920 | Phone screenshot: Anti-Cheating Radar (radar alert, CAUGHT button) |

The screenshots are **real captures of the game**, not drawings. The script plays the actual build in a headless browser and sets up each scene by changing only what's displayed (the question text, the student's answer, which student is selected). That keeps them true to the app, which Google Play requires.

## How to regenerate

1. Install the project's dependencies and build the game:
   ```bash
   npm install
   npm run build
   ```
2. Install Playwright (one time). `--no-save` keeps it out of `package.json`:
   ```bash
   npm i --no-save playwright
   npx playwright install chromium
   ```
3. Run the generator from the repository root:
   ```bash
   node docs/store-assets/generate.mjs
   ```

All files in this folder are overwritten in about 20 seconds.

Options (environment variables):
- `PLAYWRIGHT_MODULE=/path/to/playwright`: use a Playwright installed somewhere else.
- `CHROMIUM_PATH=/path/to/chromium`: use a specific Chromium binary.

## Editing the designs

- `templates/icon.html`: the app icon (chalkboard with "A+", red pen, "MTL", orange-to-amber gradient).
- `templates/feature.html`: the feature graphic (title, subtitle, chalkboard, teacher, books, pen).
- `templates/_art.js`: shared SVG drawings (chalkboard, red pen, books) used by both templates.
- `generate.mjs`: how each screenshot is staged. Look for the numbered `// 1) … // 4)` sections.

You can open the templates directly in a browser to preview them, as long as `node_modules` is installed, because the fonts load from there. Fonts used: Fredoka and Patrick Hand (SIL Open Font License). Emoji: Noto Color Emoji, as rendered by Chromium.
