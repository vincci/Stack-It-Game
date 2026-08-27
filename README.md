# Stack It Higher

A mobile-first public stacking game with a Cloudflare D1-backed global
leaderboard. The original visual identity and birthday note are preserved,
while the game uses a 15-stack, section-based scoring system.

## Game rules

- The automatically placed base is stack 1, contains 15 sections, and starts
  the player at 150 points.
- Each surviving section is worth 10 points.
- Every moving block has exactly the same number of sections as survived the
  previous placement. Discarded width cannot be regained.
- A zero-section overlap ends the game without adding points.
- Stack 15 completes the run; no stack 16 is created.
- Fourteen perfect drops after the base produce the maximum score of 2,250.

After a run, the player first chooses either **Submit score** or **Play
again**. Choosing submission opens the name form; a successful save shows the
public top-10 leaderboard. The birthday note remains freely available from
the game header and is not a reward for winning.

## Architecture

The frontend remains framework-free:

- `index.html` — markup and the preserved embedded birthday artwork.
- `style.css` — existing visual system plus result, leaderboard, HUD, and 🤩
  celebration styling.
- `script.js` — game engine, result flow, and same-origin API integration.
- `game-rules.js` — pure scoring and section rules shared with automated tests.

Cloudflare Pages Functions provide:

- `POST /api/score` with `{ "name": "Vincent", "score": 1840 }`.
- `GET /api/leaderboard` returning the global top 10.

Names are trimmed, restricted to readable characters, and limited to 12
characters. Scores must be integers from 0 through 2,250. The API uses
prepared D1 statements and no cross-origin configuration.

Versioned schema changes live in `migrations/`. The Pages Function D1 binding
is named `DB` and is configured in `wrangler.jsonc`.

## Local development

```sh
npm install
npm run db:migrate:local
npm run dev
```

Open `http://localhost:8788`. Local D1 state is stored under `.wrangler/` and
is ignored by Git.

Run all API and game-rule tests with:

```sh
npm test
```

`npm run build` creates `.pages-dist/` containing only the public frontend
files. Cloudflare Pages uses `npm run build` as its build command and
`.pages-dist` as its output directory.

## Development deployment

The development environment is intentionally separate from production:

- Pages project: `stack-it-game-dev`
- D1 database: `stack-it-game-leaderboard-dev`
- Feature branch: `feature/public-leaderboard`

No production domain, Worker, Pages project, or database should be changed
until the feature branch has been reviewed and explicitly approved.

## Known limitations

- Scores are client-reported but server-validated. This version is not
  cheat-proof; the server rejects invalid types and values above 2,250.
- No account system or personal data collection is included.
- No server-side rate limiter is configured. The client prevents accidental
  duplicate submissions, and the API performs strict validation.
- Fullscreen is progressive enhancement. Browsers without support, including
  some iOS Safari configurations, continue without entering fullscreen.

## Credits

- Google Fonts: Archivo Black, Baloo 2, Honk, Bitcount Grid Single, and DM
  Sans.
- The original stacking mechanic began from
  [Block Stacker](https://codepen.io/editor/Nathaniel-Caruana/pen/019f651c-dbd4-7957-a199-7acef90166e2)
  by NACAR (Nathaniel Caruana).
