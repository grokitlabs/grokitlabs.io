# grokitlabs.io

Public landing site for **GrokitLabs** — an independent software lab building market-data and trading tools (StockGrok, TickerStrike). Static site, deployed via GitHub Pages (`CNAME` → grokitlabs.io).

This file is excluded from the published site (see `_config.yml`).

## What lives here

The public website: `index.html`, `styles.css`, `_layouts/`, `_config.yml`, assets, and the `/writing/` content system described below. This repo is **public** — keep it that way. No strategy, methodology, or internal docs (implementation specs/plans under `docs/` are also excluded from publish — see `_config.yml`'s `exclude:` list).

## Voice

Clean, credible, confident. GrokitLabs is the company/umbrella brand (more professional than Army Coding's irreverence). Keep the site simple and fast — the homepage is a storefront and a point of contact, not a blog. `/writing/` is where longer how-tos and write-ups live instead.

## Contact

michael@grokitlabs.io

## Running locally

Jekyll is installed globally (via rbenv) rather than through a project
`Gemfile`, so no `bundle exec` is needed:

```bash
jekyll serve
```

Then visit `http://localhost:4000`. `jekyll serve --watch` (the default)
rebuilds on file changes; add `--drafts` if you ever use the built-in
`_drafts/` folder for the native `posts` collection (not used here — see
"Drafts" below for how `/writing/` pages handle this instead).

To just build without serving (e.g. to sanity-check before committing):

```bash
jekyll build
```

This writes to `_site/` (gitignored). Check the output for any `Liquid
Warning` lines — the build "succeeding" doesn't mean the Liquid rendered
correctly, only that it didn't hard-error.

## Pages that display data from the private studio repo

Some pages (starting with the `/work/` offer page) show numbers — prices,
scopes — that are *decided* in the private `grokitlabs-studio` repo, not here.
Those pages never hardcode the numbers; they render them from a data file in
`_data/`. This keeps a value in one place and lets the private reasoning
behind it (margins, effort estimates) stay out of this public repo.

The mechanism, the exact source-of-truth chain, and the step-by-step "how to
change a price without breaking it" live in **[`_data/README.md`](_data/README.md)**
— read that before editing anything under `_data/` or any number shown on a
page. The one-line version: `_data/pricing.yml` is the *public render source*;
the *upstream source of truth* is `grokitlabs-studio/offer/pricing.md`; keep
them consistent, and never put private reasoning in this repo.

### Publishing a page that uses studio data

Same as any page (author on a `draft/*` branch → `jekyll serve` to preview →
merge to `main` → push), with one added step: before you push, make sure the
numbers in `_data/pricing.yml` match the current decision in the studio
master. After building, `grep` the value in `_site/…/index.html` to confirm
it rendered (an undefined data key renders *empty*, not as an error). The
`/work/` page is also marked `noindex` while it's staged-but-not-launched;
remove that front-matter flag (and add the homepage link) when you actually
launch it.

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

### Drafts

Jekyll's built-in `_drafts/` folder + `--drafts` flag only works for the
native `posts` collection — it does nothing for a custom collection like
`writing`. The equivalent for `_writing/` is a `published: false` front
matter flag, which Jekyll honors on any collection document:

```yaml
---
title: "Page Title"
description: "One sentence — used for <meta description> and the index card."
date: 2026-07-09
published: false
---
```

- `jekyll serve` / `jekyll build` (and what GitHub Pages runs to publish
  the live site) **skip** any document with `published: false` — it won't
  appear in `_site/`, won't appear on the `/writing/` index, and won't be
  live.
- `jekyll serve --unpublished` (or `jekyll build --unpublished`) **includes**
  it, rendered at its real final URL (`/writing/my-new-post/`) — so you can
  preview it locally exactly as it'll look once published, no separate
  staging location to keep in sync.
- To publish: delete the `published: false` line (or set it to `true`) and
  commit. Nothing moves — the file's path and URL never change between
  draft and published state, which avoids the class of bug where a
  drafts-folder post gets a different permalink than its published version.

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
