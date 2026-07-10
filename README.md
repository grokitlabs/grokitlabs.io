# grokitlabs.io

Public landing site for **GrokitLabs** — an independent software lab building market-data and trading tools (StockGrok, TickerStrike). Static site, deployed via GitHub Pages (`CNAME` → grokitlabs.io).

This file is excluded from the published site (see `_config.yml`).

## What lives here

The public website: `index.html`, `styles.css`, `_layouts/`, `_config.yml`, assets, and the `/writing/` content system described below. This repo is **public** — keep it that way. No strategy, methodology, or internal docs (implementation specs/plans under `docs/` are also excluded from publish — see `_config.yml`'s `exclude:` list).

## Voice

Clean, credible, confident. GrokitLabs is the company/umbrella brand (more professional than Army Coding's irreverence). Keep the site simple and fast — the homepage is a storefront and a point of contact, not a blog. `/writing/` is where longer how-tos and write-ups live instead.

## Contact

michael@grokitlabs.io

## The `/writing/` content system

A shared Jekyll collection + layout for published content pages (how-tos,
write-ups, guides), so every new piece gets the same header, typography, and
corner scene automatically — no re-pasting CSS or SVG per page.

It was originally designed and prototyped as flat static files (`style.css`,
`header.js`, `scene.js`, `template.html`) in a separate chat session,
extracted from the first real piece, "How I run my projects with Claude."
Porting it into this Jekyll repo changed three things from that original
delivery:

1. **The header is a server-rendered include** (`_includes/writing-header.html`),
   using the real `assets/logo.svg` via `<img>`, instead of an ~8KB logo SVG
   string embedded in JavaScript.
2. **The corner scene's SVG markup is a server-rendered include**
   (`_includes/writing-scene.html`) instead of a JS string. Only the
   scroll-collision fade *behavior* is still JS
   (`assets/js/writing-scene-fade.js`).
3. **Posts are Jekyll collection documents** (`_writing/*.html`) with front
   matter, not standalone HTML files — so a new page needs zero
   boilerplate (no `<html>`/`<head>`/style block/logo/scene markup) and
   automatically appears on the `/writing/` index.

Design spec and implementation plan for this port live in
`docs/superpowers/specs/2026-07-09-writing-content-system-design.md` and
`docs/superpowers/plans/2026-07-09-writing-content-system.md` (excluded
from publish, git history only).

### Adding a new post

1. Create a new file in `_writing/`, e.g. `_writing/my-new-post.html`.
2. Add front matter:
   ```yaml
   ---
   title: "Page Title"
   description: "One sentence — used for <meta description> and the index card."
   date: 2026-07-09
   ---
   ```
3. Write the body using the component classes below. No `layout:` needed —
   `_config.yml` sets it automatically for everything in `_writing/`.
4. It's live at `/writing/my-new-post/` and appears on `/writing/`
   automatically, newest first.

### The color system

Three accent hues, used consistently across every piece so nothing clashes:

| Token | Hex | Meaning |
|---|---|---|
| `--accent-a` | `#f2a93c` amber | The human / the reader / "you" |
| `--accent-b` | `#e1001a` red | Claude / the assistant / brand red |
| `--accent-c` | `#35b7d1` cyan | Data, files, tools, external systems |

Apply via `.player-a/b/c`, `.tag-a/b/c` (and `.tag-ab` for a "both" combined
tag), and `.say.a` / default `.say` (red) / `.say.c` for quote callouts.
Reuse the same mapping across pieces — readers who see multiple pages will
start reading the colors as a convention, which is the point.

### Design rules (keep these so pages don't drift apart)

1. **Never hardcode the brand colors inline.** Always use the CSS variables
   in `assets/css/writing.css`. If a page needs a new color, add it as a
   token there, not ad hoc.
2. **Don't paste the logo or scene SVGs into a page again.** They live in
   `_includes/writing-header.html` / `_includes/writing-scene.html`. If the
   real logo or scene art changes, update it in exactly one place and every
   page picks it up.
3. **The scene is decorative only.** `aria-hidden`, `pointer-events: none`.
   Never put anything the reader needs to interact with inside it.
4. **Content max-width stays at 720px** (`.wrap`). Don't widen it per-page —
   the line length is tuned for readability against this type scale.
5. **One honest voice.** These pages are personal write-ups shared for
   awareness, not product marketing — keep the first-person, "here's
   exactly what I did" tone established in the first piece.

### What's still undecided

- The homepage doesn't link to `/writing/` yet — deliberately deferred
  until ready to make it public.
- The homepage's own visual treatment is separate and unresolved — this
  system is for `/writing/` content pages only. Don't retrofit the
  homepage to match this until that's deliberately decided.
