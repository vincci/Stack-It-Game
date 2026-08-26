Stack It Higher

A small public stacking game with a Cloudflare D1-backed global leaderboard.
The frontend remains plain HTML, CSS, and JavaScript with no framework or
bundler. Cloudflare Pages Functions provide the two same-origin API routes.

Built for Derren's Birthday 

---

## What it is

A landing screen leads into a Stack-style tower-building game. Stack blocks
as neatly as possible; each miss trims the block down, each near-perfect hit
pauses the game for a celebratory beat. The final tier is a lit candle
instead of a block — placing it successfully triggers a confetti burst. Every
completed run then continues to score submission and the leaderboard.

The original birthday card remains freely available from the game header; it
is no longer something a player has to earn by completing the game.


## Stack / dependencies

The game frontend is split into three local files:

- **`index.html`** — markup only.
- **`style.css`** — all styling, linked via `<link rel="stylesheet" href="style.css">`.
- **`script.js`** — all game logic, loaded via `<script src="script.js"></script>`.

Plus two external loads, both left as remote `<head>`/`<body>` tags rather
than pulled local:

- **Google Fonts** — Archivo Black (game UI), Baloo 2 (game title), Honk
  (landing screen only — it's a color font, its gradient can't be
  recolored via CSS), Bitcount Grid Single (landing button), DM Sans
  (body text). One `<link>` in `<head>`.
- **js-confetti** — `https://cdn.jsdelivr.net/npm/js-confetti@latest/...`,
  loaded via `<script>` before `script.js`. Zero-dependency, canvas-based
  confetti library.

Everything else — fonts aside — is self-contained: no images as separate
files (the sticker on the birthday card is embedded as base64 directly in
`index.html`), no other assets to keep in sync.

**Dependency risk, worth knowing:** if jsDelivr is unreachable, confetti is
skipped while the game and leaderboard continue to work.

## Leaderboard API

- `POST /api/score` accepts `{ "name": "Vincent", "score": 13 }`.
- `GET /api/leaderboard` returns the global top 10.

Names are trimmed, limited to 12 characters, and restricted to ordinary
letters, numbers, spaces, dots, apostrophes, and hyphens. The server accepts
integer scores from 0 through the game's actual maximum of 13. D1 queries use
prepared statements and responses are not cached.

The schema is versioned in `migrations/`. The Pages Function binding is named
`DB` and is configured in `wrangler.jsonc`.

## Local development

```sh
npm install
npm run db:migrate:local
npm run dev
```

Then open `http://localhost:8788`. Wrangler persists the local D1 database in
`.wrangler/`, which is ignored by Git.

Run the API test suite with:

```sh
npm test
```

`npm run build` creates `.pages-dist/` with only the three public frontend
files. In Cloudflare Pages, use `npm run build` as the build command and
`.pages-dist` as the build output directory.

## Known limitations

- **Fullscreen on iOS Safari:** `requestFullscreen()` has historically not
  worked for arbitrary page content on iOS Safari (video-only support).
  The call is wrapped in a feature check and `.catch()`, so it fails
  silently there rather than breaking anything — it's genuine progressive
  enhancement, not a requirement.
- **Very short viewports:** the "no camera shift" board sizing was tuned
  against the board's *maximum* rendered height. On unusually short
  screens where the board compresses toward its minimum, the shift can
  still occur.
- **Honk's color is fixed:** it's a COLR/SVG color font with a baked-in
  gradient; `color` in CSS cannot retint it. That's why it's scoped to the
  landing screen only rather than used across other headings.

## Editing

The frontend remains in `index.html`, `style.css`, and `script.js`. Pages
Functions live under `functions/api/`, and versioned D1 schema changes live
under `migrations/`.

## Credits

- **[js-confetti](https://github.com/loonywizard/js-confetti)** by
  [loonywizard](https://github.com/loonywizard) — MIT licensed, loaded via
  jsDelivr. Powers the confetti burst on a successful candle placement.
- **Google Fonts** — Archivo Black, Baloo 2, Honk, Bitcount Grid Single,
  DM Sans. See the [Google Fonts license](https://fonts.google.com/attribution)
  (all Google Fonts are open source, most under OFL).
- **The stacking-game mechanic** started from [Block Stacker](https://codepen.io/editor/Nathaniel-Caruana/pen/019f651c-dbd4-7957-a199-7acef90166e2)
  by [NACAR (Nathaniel Caruana)](https://codepen.io/Nathaniel-Caruana) on CodePen
