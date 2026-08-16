Happy Birthday, Derren — Stack It Up

A small birthday microsite built as an interactive stacking game. No build
step, no framework, no bundler — three plain files (`index.html`,
`style.css`, `script.js`). Drop it on any static host and it works.

Built for Derren's Birthday 

---

## What it is

A landing screen leads into a Stack-style tower-building game. Stack blocks
as neatly as possible; each miss trims the block down, each near-perfect hit
pauses the game for a celebratory beat. The final tier is a lit candle
instead of a block — placing it successfully triggers a confetti burst and a
floating birthday card, no more blocks spawn after that, the reveal is the
ending.

Missing the stack before the candle shows a (very direct) game-over screen
instead. This, not just decorated.


## Stack / dependencies

The site is split into three local files:

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

**Dependency risk, worth knowing:** if jsDelivr is unreachable when the
page loads, `new JSConfetti()` will throw and break the whole script. Low
probability given jsDelivr's reliability, but it's the one point where this
site isn't fully self-contained.

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

Three files. Search for the relevant `id`, `class`, or constant name and
edit in place — CSS is in `style.css`, markup in `index.html`, game logic
in `script.js`. There's no build step to run afterward; save and refresh.

## Credits

- **[js-confetti](https://github.com/loonywizard/js-confetti)** by
  [loonywizard](https://github.com/loonywizard) — MIT licensed, loaded via
  jsDelivr. Powers the confetti burst on a successful candle placement.
- **Google Fonts** — Archivo Black, Baloo 2, Honk, Bitcount Grid Single,
  DM Sans. See the [Google Fonts license](https://fonts.google.com/attribution)
  (all Google Fonts are open source, most under OFL).
- **The stacking-game mechanic** started from [Block Stacker](https://codepen.io/editor/Nathaniel-Caruana/pen/019f651c-dbd4-7957-a199-7acef90166e2)
  by [NACAR (Nathaniel Caruana)](https://codepen.io/Nathaniel-Caruana) on CodePen
