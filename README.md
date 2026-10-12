# My Teacher Life 🖍️

## 🌐 Developer Website & Compliance

The `docs/` folder is a small public website (landing page, privacy policy, `app-ads.txt`) hosted free on **GitHub Pages**. It is published automatically by `.github/workflows/deploy-pages.yml` on every push to `main`. The game itself stays 100% offline; nothing here is part of the app.

**One-time setup:** on GitHub, open the repo → **Settings → Pages** → under *Build and deployment*, set **Source: "GitHub Actions"**. Save. Then re-run the "Deploy website to GitHub Pages" workflow from the **Actions** tab (or push to `main`).

**Expected URLs after deployment:**

| Page | URL |
|------|-----|
| Landing page | `https://imroulofficial.github.io/my-teacher-life/` |
| Privacy Policy | `https://imroulofficial.github.io/my-teacher-life/privacy-policy.html` |
| app-ads.txt | `https://imroulofficial.github.io/my-teacher-life/app-ads.txt` |

> ⚠️ **IMPORTANT for AdMob app-ads.txt verification**
> - AdMob may require `app-ads.txt` at the **root** of the developer domain (`https://imroulofficial.github.io/app-ads.txt`), not inside the project path.
> - If verification fails with the project URL above, create a **new** public repo named **`imroulofficial.github.io`**, copy `app-ads.txt` (from this repo's root) into it, and enable Pages for it. Then use `https://imroulofficial.github.io/app-ads.txt` for AdMob.
> - The developer website you enter in Play Console must be on the same domain (`imroulofficial.github.io`), and AdMob can take up to 24 hours to crawl it.

**Where to use these URLs:**
- **Play Console → App content → Privacy Policy:** paste the Privacy Policy URL.
- **Play Console → Store settings → Developer website:** paste the landing page URL.
- **AdMob → Apps → App settings → app-ads.txt:** verify the app-ads.txt URL.

The contact email `mdimroulhassanofficial@gmail.com` appears in `docs/index.html` and `docs/privacy-policy.html`. Replace it there if it changes.

---

An offline casual game for Android by **Red Pen Studio**. You play a teacher: grade papers, catch cheaters, scan bags, sort the library and grow your school.

- **Stack:** HTML5 + CSS3 (Tailwind, bundled locally) + JavaScript (DOM + Canvas API), built with Vite
- **Android wrapper:** Capacitor 6
- **Storage:** LocalStorage. Everything works offline. Only the optional reward videos need internet.
- **Ads:** `@capacitor-community/admob`. **Rewarded videos only.** No interstitials, no banners.
- **CI/CD:** GitHub Actions builds a signed `.aab` on every push to `main`

---

## 1. What's in the game

### 7 mini-games across 5 chapters (levels 1–50, then endless levels 51+)

| # | Mini-game | Main buttons | Introduced |
|---|-----------|--------------|------------|
| 1 | 📝 **Spelling & Picture Check**: is the word spelled right and does it match the picture? | ✔ TICK / ✘ CROSS → **MARK** | Level 1 |
| 2 | 🙋 **Classroom Q&A**: pick the student who has the right answer | tap student → **SESSION** | Level 2 |
| 3 | 🔗 **Line Match Assessment**: check a student's animal → home lines, then fix the mistakes | ✔ TICK / ✘ CROSS, then draw lines | Level 3 |
| 4 | 📡 **Anti-Cheating Radar**: spot the student peeking at a neighbour | tap student → **CAUGHT** | Level 11 |
| 5 | 💯 **Test Result Reaction**: stamp A+ or F, and the student reacts | **A+** / **F** stamps | Level 12 |
| 6 | 🚨 **Morning Security Scan**: metal detector plus bag check | **SUSPICIOUS** / **APPROVE** | Level 21 |
| 7 | 📚 **Library Book Sorting**: drag books to the right subject shelf | drag & drop → **PLACE** | Level 31 |

Chapters: *First Day of School → Exam Season → Safety Week → Library Week → Principal's Challenge → Teacher of the Year (endless)*.
Difficulty goes up level by level: more students, subtler spelling mistakes, faster cheaters, hidden items, more books, and so on.

**Progression:** you earn 1–3 stars per level (by accuracy) and coins. You spend coins in **My School** on 8 facilities (Classrooms, Science Lab, Library, Computer Lab, Playground, Cafeteria, Art Studio, Sports Hall) and on **5 school sizes** (Schoolhouse → Grand Campus). Upgrades raise **offline income** and level rewards.

### The 6 rewarded ad placements

| Ad unit | Where it appears |
|---------|------------------|
| `rewarded_offline_double` `…/6621863561` | "Welcome back" popup after **2–12 h** away. x2 the offline earnings (x3 after 6 h). |
| `rewarded_auto_grade` `…/2280303036` | **Auto-Grade All** button in Spelling Check and Line Match. Grades every paper perfectly. |
| `rewarded_scanner_vip` `…/4032368404` | **X-Ray Vision 10s** in the Security Scan. Hidden items show through clothes and banned items glow. The button pulses when the player is stuck. |
| `rewarded_library_rush` `…/9731417641` | **Library Rush** appears when 10 or more books are left. All books fly to their shelves. |
| `rewarded_golden_stamp` `…/7105254304` | **Golden Stamp** in Test Result levels. Unlocks a unique stamp design, gives golden bonus coins and a **x2 coin boost for 5 minutes**. |
| `rewarded_school_grant` `…/3612556846` | **Grant** button in My School when you can't afford an upgrade or a new school size. Covers the missing coins plus 50% bonus. |

All ad IDs live in `src/core/config.js`. The AdMob App ID `ca-app-pub-1848535996024012~3576983541` is in `capacitor.config.json` and `android/app/src/main/AndroidManifest.xml`.
The function `showRewardedAd(adUnitId, onRewardEarned)` is in `src/core/ads.js` (also available as `window.showRewardedAd`). The reward is only given when the video is watched to the end.

---

## 2. One-time setup: app signing (needed for Google Play)

Google Play only accepts a **signed** `.aab`. You create a signing key (a "keystore") **once** and keep it safe **forever**. If you lose it, you can't update the app.

### Step A: create the keystore (one command)

Install Java (or Android Studio, which includes it), open a terminal and run:

```bash
keytool -genkeypair -v -keystore release.jks -alias myteacherlife -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and some name details. Write the password down.
*(Android Studio alternative: **Build → Generate Signed Bundle / APK → Create new…**)*

### Step B: turn the keystore into text

- **Mac / Linux:** `base64 -i release.jks | tr -d '\n' > release.txt`
- **Windows (PowerShell):** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks")) > release.txt`

### Step C: add 4 GitHub Secrets

On GitHub, open the repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|-------------|-------|
| `ANDROID_KEYSTORE_BASE64` | the whole contents of `release.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `myteacherlife` (the alias you used) |
| `ANDROID_KEY_PASSWORD` | the key password (usually the same as the keystore password) |

⚠️ Never commit `release.jks` or passwords to the repository (`.gitignore` already blocks `*.jks`).

---

## 3. Getting the `.aab`

1. Push to the `main` branch, or open **Actions → "Build signed Android App Bundle (AAB)" → Run workflow**.
2. Wait for the green check (about 5–10 minutes).
3. Open the finished run and download the **`my-teacher-life-1.0.N-aab`** artifact at the bottom of the page. It's a zip with the `.aab` inside.
4. Upload the `.aab` in **Google Play Console → your app → Production (or Internal testing) → Create new release**.

The version number goes up automatically on each build (`versionCode` = GitHub run number), so Play never rejects an upload as a duplicate.
If the secrets are missing, the build still runs but produces an **unsigned** bundle and shows a warning.

---

## 4. Before publishing: checklist

- **Test ads safely:** set `ADS_TESTING = true` in `src/core/config.js` while you play-test on your own phone. Clicking your own real ads can get an AdMob account banned. **Set it back to `false` before the release build.**
- **app-ads.txt:** AdMob asks you to publish an `app-ads.txt` file on your developer website (the site you list in Play Console).
- **Privacy policy:** apps with ads need a privacy-policy URL in Play Console.
- **Ad consent (EU/UK):** the game shows Google's consent form automatically when required (UMP). Create a "GDPR message" in **AdMob → Privacy & messaging** so the form exists. Players can reopen it from **Settings → Ad privacy choices**.
- **Target audience:** if you mark the app as directed at children in Play Console, you also have to configure AdMob's child-directed / Families settings.
- **Play Store icon:** `store-assets/play_store_icon_512.png` (512×512).

---

## 5. Running it yourself (optional)

```bash
npm install
npm run dev        # play in your browser at the printed address (ads are simulated)
npm run build      # build the web game into dist/
npx cap sync android
npm run android    # build + open the project in Android Studio
```

In a desktop browser, reward videos are replaced by a 3-second simulation so you can test every reward.
Press **Esc** to act as the Android back button.

---

## 6. Project structure

```
index.html                     App shell
src/main.js                    Boot, offline-earnings popup, back button, lifecycle
src/style.css                  All visuals (Tailwind + custom "3D casual" styles)
src/core/config.js             AdMob IDs, ADS_TESTING switch, tuning values
src/core/ads.js                AdMob init, consent, showRewardedAd()
src/core/storage.js            LocalStorage save game
src/core/economy.js            Coins, school upgrades/sizes, boosts, offline income
src/core/levels.js             Chapters, level → mini-game table, difficulty
src/core/runner.js             Level runner: HUD, pause, timers, power-ups, results
src/core/stamps.js             Golden Stamp designs
src/core/audio.js              Synthesized sound effects (no audio files)
src/core/ui.js                 Buttons, modals, toasts, confetti
src/core/router.js             Screen navigation
src/screens/*.js               Home, Levels map, Intro, Game, My School, Stamps, Settings
src/mini-games/*.js            The 7 mini-games + shared content (data.js)
capacitor.config.json          Capacitor app config (app id com.redpenstudio.myteacherlife)
android/                       Native Android project (signing config in app/build.gradle)
.github/workflows/build_aab.yml  CI: build + sign + upload .aab
```

---

© Red Pen Studio. All rights reserved.
