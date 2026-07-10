# STATE

## What this is

The public landing site for **GrokitLabs** (grokitlabs.io) — static Jekyll,
deployed via GitHub Pages (`CNAME`). A storefront and point of contact, kept
simple and fast. Local preview: `jekyll serve` → http://localhost:4000.

## Artifact map

- `index.html` — homepage: the "grok" definition over a rocket-launch hero
  scene. The rocket is clickable and launches **Chaos Blaster** (below).
- `assets/js/chaos-blaster.js` — hidden Galaga-style game (2026-07-10),
  fully self-contained, lazy-loaded on first rocket click. Waves, copy,
  difficulty, and audio manifest live in the `CONFIG` object at the top.
  Enemy appearance (glyph) is decoupled from behavior: per-wave `behavior`
  + `dive`/`split` config and per-enemy `motion`/`exit` fields, so aliens
  can be re-themed without touching logic. Enemy glyphs AND the player rocket
  are **8-bit pixel art** drawn filled via a shared `drawPixels` grid renderer
  (tones derived per-wave from the wave color); the grids live in the `GLYPHS`
  object and `ROCKET_BODY`/`ROCKET_FLAMES`. `lead` = winged coin (lost money),
  `sprawl` = a 2×2 bunch of office knowledge-worker tools (spreadsheet,
  document, presentation chart, design palette) that split into chaos bits,
  `boss`/lock-in = pixel padlock. The rocket is a pixel-traced rendition of the exact company logo (rasterized
  from `assets/logo.svg` into `ROCKET_BODY` + `ROCKET_FLAMES` 24×36 grids):
  navy nose + body + delta fins + 3 nozzles, red porthole window, 3 flame
  tongues that flicker by vertical scale anchored at the flame-top. Collision uses
  dedicated `hitW`/`hitH` (smaller than the visual sprite box) so a hit only
  registers when art actually clips — fixes the "diver brushes the player and
  the game calls it a hit" phantom-death bug. 8-bit lettering (Press Start 2P,
  lazy-loaded on open; game only, not the storefront).
- `assets/audio/chaos-blaster/` — game audio. SFX are synthesized by
  `tools/gen-audio/gen-audio.mjs`; `soundtrack.ogg/.mp3` is the licensed
  "Space Main Theme" trimmed to a seamless ~38s loop by
  `tools/gen-audio/trim-soundtrack.mjs` (source in gitignored
  `tools/gen-audio/source/`). Both need ffmpeg. Replace files under the
  same names to upgrade sounds.
- `_writing/` + `writing/` + `_layouts`/`_includes` — the content system for
  posts; drafts workflow documented in `README.md`.
- `tests/` — `node --test tests/*.test.mjs` covers the game's pure logic.
- `docs/superpowers/` — specs and plans (excluded from publish, as are
  `tools/` and `tests/`).

## Current focus

Chaos Blaster shipped. Next up: cartoon-TJ mascot art (the game's victory
screen reserves a cameo slot) and the DIY vs Concierge visuals for the
product pages.

## Graveyard

- `run-your-projects-with-claude-old.html`, `wrangler.html`,
  `personal-wrangler-simple.html` — superseded page experiments kept at root;
  candidates for deletion.
