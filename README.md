<div align="center">

<img src="assets/image/skins/espo.webp" alt="Espòòò — the face you click" width="160">

# 🚨 Espòòò Clicker

<p><b>The Ultimate Bug-Farming Simulator</b> — a satirical idle/clicker about developer life.<br>
You click a manager's face. The bugs get fixed. The bugs come back.</p>

### [▶︎ Play it in the browser](https://espooclicker.altervista.org)

<sub>Public launch 3 August 2026, 07:00 UTC. Until then that link serves a countdown page, honestly.</sub>

[![Quality](https://github.com/SickSartori/espo-clicker/actions/workflows/quality.yml/badge.svg)](https://github.com/SickSartori/espo-clicker/actions/workflows/quality.yml)
[![E2E](https://github.com/SickSartori/espo-clicker/actions/workflows/e2e.yml/badge.svg)](https://github.com/SickSartori/espo-clicker/actions/workflows/e2e.yml)

</div>

<!-- TODO: gameplay screenshot goes here (index.php at 1280x800: bug counter + shop).
     None exists in the repo yet; manifest.json "screenshots" is empty too. -->

## What it is

- A clicker game about the one thing every developer has infinite of. Every click resolves exactly one bug and pays you in **Bug Risolti** (Solved Bugs). Bug Risolti buy upgrades. Upgrades generate more bugs per second. The math checks out.
- You are not a developer here, and you are not a QA specialist. You are **The Clicker**, a god-like entity whose sole purpose is to make the suffering of Espòòò — the permanently surprised manager — stop. (It will not stop.)
- 11 teams, 89 upgrades, 29 skins, 45 achievements, 6 arcade minigames, 2 languages, 4 progression loops (two of which exist to delete the other two), and one Christmas skin that snows.
- Under the hood: 67 strict TypeScript modules bundled by Vite, a PHP shell, Supabase Edge Functions for saves and leaderboard, an installable PWA, and a CI pipeline more serious than most people's day jobs.

## ⚡ Quick start

You need a PHP server (**MAMP**/XAMPP) and **Node.js**. No local database — the old MySQL setup is gone and nobody misses it.

1. Install deps and build the engine. **Skip this and the game simply will not load:**
   ```bash
   npm install
   npm run build          # Vite → dist/game.modules.js   (npm run dev:v3 for live reload)
   ```
2. `php/config.php` is already in the repo, pre-filled with the MAMP defaults (`localhost` / `root` / `root`). Touch it only if your credentials differ. The two optional configs are the ones you have to create:
   ```bash
   cp php/r2-config.example.php php/r2-config.php         # (optional) audio + video from Cloudflare R2
   cp php/trello-config.example.php php/trello-config.php # (optional) the "Segnala" (Report) button → Trello
   ```
   Without them you get a silent game and a feedback button that goes nowhere. Everything else works.
3. Serve the folder with PHP and open **`index.php`** (MAMP → `http://localhost:8888/Espo-Clicker/`).
4. Start clicking.

Cloud saves and the leaderboard run on **Supabase Edge Functions**, and the environment (dev vs production) is auto-detected from the hostname — one build serves both. The public anon keys already live in `src/lib/backend-config.ts`, so there is nothing left to wire up.

Locally you will be playing in Italian. Language lives in a cookie, there is no auto-detection, and switching it writes the cookie and reloads the page. There are exactly two languages, `it` and `en`, served by two completely separate systems: PHP labels for the static markup (250 keys per file, identical key sets) and a JS overlay that rewrites the game data in place.

### Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev:v3` | Vite dev server |
| `npm run build` | Production build: bundle + legacy CSS pass + vendor copy + arcade loader |
| `npm test` | Unit tests (Vitest + jsdom) |
| `npm run test:e2e` | Playwright E2E |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run budget` | Bundle size check against the declared budgets |
| `npm run release` | Patch version bump + build |

## 🎯 The four loops

The whole game is four loops, and the bottom two exist to wipe the top two.

| # | Loop | What it does |
|---|------|--------------|
| 1 | **Click** | Click Espòòò's face. Clicks within 350 ms of each other build a **combo**: from combo 6 onward every step adds +1% to the click, capping at +100% — reached at combo 105, at which point your finger is a liability. |
| 2 | **BPS** | Buy **11 teams**, from the *Assistente QA* (15 bugs, 0.1 BPS) up to *Architettura dell'Infinito* (3.84e12 bugs, 1.1e10 BPS). Each unit makes the next one cost ×1.22 — down to ×1.12 if you max the *Contrattazione* (Negotiation) upgrade, because negotiating is a skill. |
| 3 | **Promozione** (Promotion — the prestige reset) | Available at 50,000,000 × 3^(resets) bugs. Lose the economy, keep the collection, gain **Token Lab** — lab tokens, the prestige currency — as `floor(sqrt(min(totalScore, threshold×4) / 250,000))`. Yes, there is an anti-grind cap at 4× the threshold. We saw what you were planning. |
| 4 | **Formattazione** (Format — new game plus) | Wipes even the Token Lab, pays out 1 guaranteed **Q-bit** plus `floor(sqrt(prestigePoints / 10,000))`, and opens the 9 quantum super-upgrades. |

There are **89 upgrades** across four shops and three currencies: 12 click upgrades and 55 team enhancements (five per team, unlocked at 1/10/25/50/100 units owned) priced in Bug Risolti, 13 Promozione upgrades priced in Token Lab, and 9 quantum super-upgrades priced in Q-bits. Nothing here is priced in real money, which is the joke.

The permanent Promozione multiplier has a **softcap**: past +80 it goes square-root with a 0.6 coefficient, because otherwise the late game turns into a spreadsheet with a screensaver.

<details>
<summary><b>Everything that interrupts the grind</b> (click to expand)</summary>

- **Ticket Critico (Golden Bug)** — spawns on a random 60–120 s timer and does not wait around. Three flavours: standard (70%), lucky (18%, ×8 reward), frenzy (12%, ×2 reward plus a ×7 click buff for 15 s). *Ticket Premium* multiplies the 60 s base spawn timer by 0.5; *Risonanza Aurea* (Golden Resonance) multiplies it by another 0.75. Buy both and the base falls to 22.5 s.
- **Blue Screen & friends** — **not** on a timer. Every click has a 0.05% chance of firing an event, behind three gates: a 300 s cooldown, no other event already running, and at least 404 bugs on the counter. There are 6 events — three video ones (Rick Roll, Ricardo Flex, Britney Espears) and three CSS-only ones (System Error 404, Matrix Glitch, Super Star Mode). *Which* one you get depends on the skin you are wearing, which is the closest this game gets to a dress code.
- **Espo Fury** — a 200-token Lab upgrade that multiplies BPS by 7 for 30 s (60 s with the *Overclock* super-upgrade). The cooldown counts from the *end* of the fury: 300 s minus 30 s per level of *Rete di Contatti* (Contact Network), floored at 60 s. Networking pays.
- **Offline earnings** — count at most 12 hours and pay 30% of your BPS, rising +10% per level of *Server Always-On* up to 100%. Sleep is finally productive.
- **Daily bonus** — a login streak that grows until day 7 and then politely stops. It lives in `localStorage`, not in the save, so cloud merges cannot eat it.
- **Team milestones** — purely cosmetic. A toast and a flash. That is the whole reward. We are not sorry.

</details>

## 🧩 Collection, competition, company

**29 skins** across 6 rarities (3 common, 6 rare, 7 epic, 10 legendary, 2 divine, 1 Christmas). Rarity is *deliberately* cosmetic: it colours the borders, the **Podio** (leaderboard) and the ambient background, and touches none of the numbers. Eight of the 29 go further — they carry a `themeConfig` that swaps in a whole theme stylesheet, changes the background music, recolours the Golden Bug and switches on an ambient VFX. Still no numbers. Yes, the Christmas skin snows.

15 are bought with Token Lab (four of those also demand at least one Formattazione), 13 are achievement rewards, one is both, and two are never for sale: the default face you start with, and the Fondatore skin — see Season 1, below. One of them, **ESPOSION**, is a dynamic skin driven by your combo across 10 phases: the art cracks, then chars, then detonates. Purely decorative. Extremely worth it.

**45 achievements**, 6 of them secret. 15 give you nothing but dopamine; 13 hand over a skin, 10 pay in bugs, 4 in Token Lab, and 3 grant a permanent multiplier (+10%, +15%, +25%) — those three refuse to unlock until you have done your first Promozione.

**Podio** — two scopes, global and friends-only, served by two different Edge Functions. It forces a save before reading, then waits 200 ms for the database to catch up, because distributed systems are a lie we tell ourselves.

**Social** — friend search, requests, accept/reject, removal, a friend profile with stats and a skin locker, and a chat restricted to a closed whitelist of 16 emoji and 8 preset phrases. This is not censorship, this is *scope management*. Online status is computed server-side on a 300 s threshold, so "Online" means "was here recently", like every other social product.

## 🕹️ The arcade (Sala Giochi)

Six minigames on their own page (`arcade.php`), behind their own login gate, opened in a new window — the main game has enough to do. Scores convert to bugs at `bps × score × coefficient` and are handed back through `localStorage`; the main tab collects them on a 5 s poll and again whenever you focus it.

| Game | Engine | Reward coefficient |
|------|--------|--------------------|
| Snake Protocol — `arcade/snake` | Canvas 2D | 0.05 |
| Space Impact — `arcade/space` | Canvas 2D | 0.05 |
| Espo-Roids — `arcade/asteroids` | Canvas 2D | 0.04 |
| Bug Invaders — `arcade/invaders` | Canvas 2D | 0.04 |
| Bug Crawler — `arcade/centipede` | Canvas 2D | 0.05 |
| Super Espò — `arcade/super-espo` | Phaser 3.60 (CDN, lazy) | scales with the level reached |

Phaser is fetched on demand from a CDN and only Super Espò needs it, so it sits in its own promise chain: if the CDN falls over, the other five stay playable. Those five synthesize every sound they make in Web Audio from zero asset files — cheaper than shipping a single bleep. Super Espò is the only one with real audio, served from R2 behind pre-signed URLs.

Touch players get a shared on-screen pad that fires real `KeyboardEvent`s (plus haptics), reconfigured per game: Snake gets a bare d-pad, Bug Invaders gets left/right and FIRE, and Espo-Roids renames UP to BOOST, which is the entire extent of its flight model.

## 🛠️ Stack

- **Build** — **Vite 5.4**, single entry `src/main.ts` → `dist/game.modules.js` (ESM, target es2022, esbuild minify). A custom Vite plugin sweeps up the non-ESM leftovers on `closeBundle`.
- **Language** — **TypeScript**, maximum paranoia: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`.
- **Shell** — **PHP**. `index.php` *is* the app shell — there is no `index.html` and no JS router — plus 10 partials in `includes/` and the i18n labels from `langs/`.
- **Runtime deps** — `break_eternity.js` + `break_infinity.js` (big numbers, because 1e10 BPS is the *early* game), `lz-string` (save compression), `lucide` (icons), `motion` (animation), `pixi.js` (WebGL effects).
- **Backend** — **Supabase**: 7 tables with RLS on all of them, reached through 18 Edge Function slugs. The client never talks to the database directly, and that is not a stylistic preference.
- **Media** — **Cloudflare R2** for audio and video only, behind AWS SigV4 pre-signed URLs generated in plain PHP with no SDK, batched and cached client-side.
- **Offline** — service worker with three caching strategies and a never-cache list, a **PWA manifest** (installable, `standalone`), and two module Web Workers for offline earnings and save compression.

<details>
<summary><b>The parts we're quietly proud of</b></summary>

- **One scheduler, not sixty timers.** A single `requestAnimationFrame` drives fixed-rate ticks and virtual-time tasks, replacing 60+ scattered `setInterval`/`setTimeout` calls. It caps the delta at 2000 ms and auto-pauses on `visibilitychange`.
- **Workers that degrade instead of hanging.** If a worker fails to start or crashes, an `error` listener marks it dead, rejects every pending promise, and the computation falls back to the main thread. No promise is left dangling to think about what it did.
- **Three copies of your save that can't drift.** IndexedDB (`EspoClickerDB` → `saves` → `espotoolClickerSaveV9`), payload compressed with `LZString.compressToUTF16`, `localStorage` as the fallback. The state is serialized **once** and the identical compressed payload goes to IndexedDB, localStorage and the cloud.
- **Migrations are pure.** A chain of steps (v1→v2, v2→v3) up to `CURRENT_SCHEMA_VERSION = 3`, idempotent, with zero DOM or window side effects — those come back as a `MigrationReport` for the caller to apply. A save from the future throws a clear "update your client" error instead of silently downgrading you.
- **Anti-rollback that actually holds.** The client has a pure comparator (Formattazioni > lifetime prestige > lifetime score), but the authority is a `SECURITY DEFINER` Postgres function doing `SELECT ... FOR UPDATE` and returning explicit conflicts. It is season-aware: a higher incoming season is always accepted, a lower one is rejected.
- **A service worker tuned for a flaky host.** Navigation requests race the network against a 2500 ms timeout and serve the cached copy immediately if there is one — a direct countermeasure to a shared host whose TTFB has been measured anywhere between 63 ms and 4400 ms for the *same* request.
- **Accessibility, done properly and then bragged about.** Real skip link, ARIA landmarks and live regions, ARIA state updated at runtime, keyboard handling on the Golden Bug, Escape-to-close on modals. 44px touch targets and 16px inputs so iOS stops zooming; safe-area insets; pinch-zoom deliberately left unblocked. `prefers-reduced-motion` is honoured in 46 separate places, including a whole alternate intro — and the Super theme's flashes were pulled below 3 per second for photosensitivity, which cost us the best flash in the game.

</details>

## 🗂️ Architecture

```
espo-clicker/
├─ index.php          # the app shell — 519 lines of PHP rendering the HTML
├─ arcade.php         # the arcade, standalone page with its own login gate
├─ sw.js              # service worker: batched precache, three strategies
├─ manifest.json      # PWA
├─ src/               # the game engine — 67 TypeScript modules + 22 test files
│  ├─ app/            # boot + global error handling
│  ├─ core/           # pure, tested logic: save codec/db, migrations, anti-rollback,
│  │                  # scheduler, i18n overlay, crypto, bignum
│  ├─ data/           # teams, upgrades, skins, achievements, events + the EN overlay
│  ├─ game/           # economy, prestige, events, logic
│  ├─ lib/            # window.* bridges for what's still classic script
│  ├─ state/          # shared store, game state, save DB
│  ├─ types/          # save schema
│  ├─ ui/             # render, modals, podio, social, intro, fx, theme, toast, icons
│  └─ workers/        # offline earnings + save compression
├─ arcade/            # six minigames, one folder each
├─ php/               # endpoints: launch gate, R2 signing, version, language, feedback
├─ includes/          # PHP partials for index.php
├─ langs/             # it.php / en.php — 250 labels each, identical key sets
├─ styles/            # CSS source
├─ js/                # the last three classic scripts standing
├─ scripts/           # build plugin, bundle budget, version bump, deploy console
├─ dev/               # sql/ (Supabase schema) · tests/ (E2E specs) · docs/
├─ assets/ · music/   # art locally; audio and video come from R2 in production
└─ dist/              # build output (generated) — this is what ships
```

## ✅ Tests and quality gates

- **218 unit tests** across 22 `src/**/*.test.ts` files (Vitest, jsdom — configured inside `vite.config.ts`; there is no separate `vitest.config`). The densest are the economy and anti-rollback suites, which is where bugs would hurt instead of amuse.
- **17 E2E tests** across 5 Playwright specs, Chromium only, `workers: 1` and `fullyParallel: false` — the specs mutate a shared game state, so running them in parallel produces beautiful nonsense.
- On every PR, **typecheck and unit tests are blocking**. The bundle budget is explicitly `continue-on-error`, which is convenient, because `dist/game.modules.js` currently ships at 399 KB raw / 113 KB gzip against a declared budget of 90 / 25 KB. We know. It's on the list. The list is long.

## 🚀 Deploy

Deployment is FTP, and only half of it is automatic:

- Pushing to `test` triggers the test deploy on its own.
- **Production does not deploy on push to `main`.** `main.yml` is `workflow_dispatch` only — merging and tagging publishes a tag and nothing else until somebody starts the workflow by hand from the Actions tab. This is a feature. Mostly.

| Branch | Role | What happens |
|--------|------|--------------|
| `develop` | where work happens | Quality + E2E run on every push and PR |
| `test` | deploy mirror | force-pushed from `develop`; a push here auto-deploys to the test server |
| `main` | production | merged `--no-ff` from `test` and tagged `v<version>` |

The two targets differ on purpose: the production job **deletes** the cheatboard script before uploading, while test keeps it. Runtime cache-busting ignores the version number entirely — it uses `filemtime()` on the built files and only falls back to the configured version if a file is missing.

There is also a local **Deploy Console** (`deploy-ui.bat`): a zero-dependency Node HTTP server bound to `127.0.0.1:4599` that opens your browser, streams command output over Server-Sent Events, and holds a global lock so you cannot fire two deploys at once. It runs everything with `shell: false` and argument arrays, and routes npm through `cmd /c` on Windows specifically to dodge CVE-2024-27980. A deploy tool with a threat model, for a game about clicking a man's face.

### Two things the pipeline will never upload for you

**1. Server secrets.** `php/secrets.php` holds the R2 keys and the Trello token. It is gitignored, so it is not in the repo, it does not exist in the CI checkout, and no deploy will ever push it. It lives on the Altervista server and **you put it there by hand, over FTP** — and again whenever it changes. Generate it from `php/secrets.example.php`, or migrate the older split files with `php scripts/merge-secrets.php --write`.

If it is missing in production the failure is indirect and easy to misread: the signer returns 500, the client falls back to local asset paths, and those 404 — because sounds, videos and jukebox tracks are excluded from FTP and only exist on R2. Silent game, no obvious cause. `php/secrets-load.php` still falls back to the older `php/r2-config.php` and `php/trello-config.php` if they are on the server, so the switch to the single file can happen whenever you like; that fallback is meant to be removed once it has.

**2. Media.** `assets/sounds/**`, `assets/video/**` and `music/songs/**` are excluded from FTP and served from Cloudflare R2. Changing a file in the repo changes nothing in production until it is synced — `deploy.bat` option 12 for video only, option 10 for everything. Verify with `rclone check --checksum` rather than trusting the transfer count: rclone reports "0 transferred" both when the upload already happened and when it silently matched the wrong thing.

## 📅 Project status

**v3.0.13**, on the runway. Public launch is **3 August 2026, 07:00 UTC**, and the date is enforced *server-side* with PHP's `time()`: before launch, `index.php` and `arcade.php` include the countdown page and `exit`, so the game bundle is never even sent to the browser. The countdown screen also unregisters the service worker and clears every cache, so nobody ends up trapped in a cached waiting room.

That launch starts **Season 1**, and anyone with a real pre-launch save (at least one Promozione, or one non-default skin) is migrated to **Fondatore** (Founder) status: an exclusive `divine` skin with no price and no achievement attached — permanently unobtainable for everyone who arrives after — plus up to 5 kept skins, with an interactive picker if they had more.

<details>
<summary><b>Known quirks</b> — it's a game about bugs, it would be dishonest to pretend</summary>

- *Hacking Etico* (Ethical Hacking, 10M bugs) promises to double your Ticket Critico odds. It doubles `goldenBugChance`, a variable the Golden Bug spawn scheduler never reads: the only things it actually changes are the colour and size of the floating `+N` on click, and the number shown in the stats panel.
- The onboarding manual says Espo Fury multiplies earnings ×10. Every line of code, and every other string, says ×7. The code is right.
- Arcade high scores never make it into the save. They live in a `localStorage` key nothing else in the repo reads, which means they *do* survive Promozione and Formattazione — just not for the reason the code thinks they do.
- `parity.spec.ts` is cited by the Playwright config and by two other specs as the heart of the v3 migration safety net. It does not exist.
- The service worker's cache version drifted ahead of `package.json` during a manual bump, and the workflow step meant to rewrite it is a no-op that substitutes a string with itself.
- `verify-deploy.mjs` exists, works, and was written after a partial upload left three arcade games 404ing in production. It is wired into precisely nothing and has to be run by hand.

</details>

## 📚 Docs

- [Release notes (EN)](release-notes_en.md) · [(IT)](release-notes_it.md)
- [Product brief](PRODUCT.md) — who plays it, the tone, the anti-references
- [UI conventions](dev/docs/ui.md) · [Supabase schema](dev/sql/supabase_schema.sql)

## License

There isn't one yet. No `LICENSE` file means default copyright applies: **all rights reserved**, no reuse, redistribution or forking without permission.

This is a decision still to be made, not an oversight we are hoping you won't notice. Whatever it turns out to be, the art, the audio and the Espòòò character will stay excluded — several skins are parodies of real people and real brands, and those are not ours to license.

---

**Disclaimer:** No actual QA or development teams were harmed in the making of this game. (We think.)

*Created with love and infinite bugs.*
