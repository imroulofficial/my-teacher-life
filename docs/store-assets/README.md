# Google Play store assets: My Teacher Life

| File | Size | Use in Play Console |
|------|------|---------------------|
| `app-icon-512.png` | 512 × 512 | **Store listing → App icon**: the teacher waving a red pen, with a "My Teacher Life" ribbon. A full square; Google Play rounds the corners itself. |
| `app-icon-512-rounded.png` | 512 × 512 | Pre-rounded copy with transparent corners, for websites and social media. Don't upload this one to Play. |
| `feature-graphic-1024x500.png` | 1024 × 500 | **Store listing → Feature graphic** (24-bit PNG, no alpha): title, "120 Levels • 10 Mini-Games", the 120-levels badge, a "🇧🇩 বাংলা সমর্থিত" badge, chalkboard, maths tile, pen, books and students. |
| `badge-120levels.png` | 128 × 128 | "120 Levels" medal (opaque). Used on the feature graphic and screenshot 1. |
| `screenshot-1.png` | 1080 × 1920 | Home screen: PLAY button, 🔥 streak chip, 🏆 achievements count. Caption: 120 Levels • 10 Mini-Games |
| `screenshot-2.png` | 1080 × 1920 | NEW Attendance Call: a class of 12 with the first names called A → Z |
| `screenshot-3.png` | 1080 × 1920 | NEW Blackboard Math in Bangla, Bangla digits on the board and answers |
| `screenshot-4.png` | 1080 × 1920 | Boss level 60: the three lessons played back to back |
| `screenshot-5.png` | 1080 × 1920 | Achievements screen with unlocked badges |
| `screenshot-6.png` | 1080 × 1920 | Bangla home screen (golden 🔥 streak). Caption: 🇧🇩 বাংলা সমর্থিত |

The screenshots are **real captures of the game**, not drawings. The script plays the actual build in a headless browser (360 × 560 CSS px at 3x = 1080 × 1680 px) from a sample save, using the real buttons (PLAY, START, the 🏆 button) and answering a few questions correctly. Each capture sits under a 240 px caption strip (`templates/frame.html`) that names the feature; the game picture itself is not edited.

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
3. Run the generators from the repository root:
   ```bash
   node docs/store-assets/generate.mjs        # badge + feature graphic + 6 screenshots
   node docs/store-assets/generate-icons.mjs  # app icons (store + all Android launcher sizes)
   ```

`generate-icons.mjs` writes the two store icons here, `store-assets/play_store_icon_512.png`, and every launcher icon in
`android/app/src/main/res/mipmap-*/`: `ic_launcher.png` (48–192 px), `ic_launcher_round.png`, and the Android 8+ adaptive
layers `ic_launcher_foreground.png` and `ic_launcher_background.png` (108–432 px). Each size is rendered straight from the
vector drawing, so even the 48 px icon stays sharp. The small launcher icons leave out the chalkboard, star and books
so the teacher stays readable.

Options (environment variables):
- `PLAYWRIGHT_MODULE=/path/to/playwright`: use a Playwright installed somewhere else.
- `CHROMIUM_PATH=/path/to/chromium`: use a specific Chromium binary.

## Editing the designs

- `templates/icon.html`: the app icon, a friendly teacher waving a red pen on an orange-to-yellow sunburst. It's a vector drawing (SVG), not emoji, and its options are listed at the top of the file.
- `templates/feature.html`: the feature graphic (title, subtitle, badges, chalkboard, maths tile, pen, books, students).
- `templates/badge.html`: the 128 × 128 "120 Levels" medal.
- `templates/frame.html`: the caption strip placed above each screenshot.
- `templates/_art.js`: shared SVG drawings (chalkboard, red pen, books) used by both templates.
- `generate.mjs`: how each screenshot is played and captioned. Look for the numbered `// 1) … // 6)` sections.

You can open the templates directly in a browser to preview them, as long as `node_modules` is installed, because the fonts load from there. Fonts used: Fredoka, Patrick Hand and Baloo Da 2 for Bangla (SIL Open Font License). Emoji: Noto Color Emoji, as rendered by Chromium.
