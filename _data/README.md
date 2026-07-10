# `_data/` — site data and the source-of-truth chain

Jekyll loads every `.yml`/`.json` file in this folder into `site.data.*`, so
pages can render values instead of hardcoding them. Today the only file is
`pricing.yml`, which drives the numbers on the `/work/` offer page.

**Read this before changing any number in `pricing.yml` — or before
"fixing" a price you see on the site.** The obvious edit is often the wrong
one.

## The source-of-truth chain (this is the important part)

Pricing lives in **three** places, in a deliberate order. Each has a
different job:

1. **The decision + private reasoning** →
   `grokitlabs-studio/offer/pricing.md`, in the **private** `grokitlabs-studio`
   repo. This is the *real* source of truth for what a price is and *why*
   (margins, effort-day math, day-rate floor). None of that reasoning is
   public and it must never be copied into this repo.

2. **The public render source** → `_data/pricing.yml`, **this file's folder,
   this public repo.** It holds only the *public subset* — the numbers and
   scope actually shown on the page. The page reads every number from here.

3. **The page** → `work/index.html` references `{{ site.data.pricing.* }}`.
   It never contains a hardcoded price. That's why a price appears once in
   the data file and renders everywhere it's needed (including the looped
   build-menu table) with no duplication.

So within this repo, `_data/pricing.yml` *is* the single source for what the
page displays — but it is itself **downstream** of the private studio master.
It is not where a price is *decided*. (The header comment in `pricing.yml`
says exactly this.)

## Current state vs. the plan

- **Today:** step 1 → step 2 is done **by hand** — a human copies a changed
  public number from the studio master into `pricing.yml`. This is the one
  manual seam, and the one place drift can enter.
- **Planned (studio issue GL-001, "Tier 2"):** a small generator will
  produce `pricing.yml` *from* the studio master. When that lands,
  **`pricing.yml` becomes a generated artifact — do not hand-edit it**; it
  will carry a `GENERATED — do not edit` header at that point.

## How to change a price without breaking anything

1. Change it in the studio master (`grokitlabs-studio/offer/pricing.md`)
   **first** — that's the decision.
2. Reflect the public number in `_data/pricing.yml`. Keep the two
   consistent; never let them disagree.
3. Run `jekyll build` and confirm: no `Liquid Warning` lines, and the new
   number actually rendered (`grep` the value in `_site/work/index.html`).
4. Never hardcode a price directly in a page — always add/change it here and
   reference `{{ site.data.pricing.* }}`.

## Rules (how not to break it)

- **No private data here, ever.** This repo is public. Margins, effort-days,
  day-rate math, and any pricing rationale stay in the studio repo. This
  folder holds display values only.
- **Studio master wins.** If `pricing.yml` and the studio master ever
  disagree, the studio master is authoritative — reconcile toward it.
- **Don't reference undefined keys.** A typo like
  `site.data.pricing.builds.foundatoin_setup.price` renders empty, not an
  error. After editing keys, rebuild and eyeball the page.

## For agents maintaining this repo

The invariant, short: `_data/pricing.yml` is the **public render source** for
the `/work/` page; the **upstream source of truth** for pricing decisions is
the private `grokitlabs-studio/offer/pricing.md`. If you change a displayed
number, update both and keep them consistent (until GL-001 Tier 2 makes this
file generated, after which you change only the studio master and regenerate).
If you notice the page, `pricing.yml`, and the studio master disagreeing,
treat the studio master as correct, fix `pricing.yml`, and surface the
discrepancy to the user rather than silently guessing.
