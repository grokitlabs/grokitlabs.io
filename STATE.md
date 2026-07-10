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
  difficulty, and audio manifest all live in the `CONFIG` object at the top.
- `assets/audio/chaos-blaster/` — game audio, rendered by
  `tools/gen-audio/gen-audio.mjs` (re-run to regenerate; needs ffmpeg).
  Replace files under the same names to upgrade sounds.
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
