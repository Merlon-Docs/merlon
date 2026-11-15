# What the ncurses migration produced

<!-- merlon-paths: illustrative -->

## A published edition with every change recorded

The site at <https://betsalel-williamson.github.io/ncurses/> carries all 133 manual pages, 15 guides, the 4 contributor documents, a glossary and the appendix. [`docs/appendix/errata.csv`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/docs/appendix/errata.csv) lists 302 changes:

| Category         | Rows | What it means                                         |
| ---------------- | ---- | ----------------------------------------------------- |
| `original-error` | 159  | An error in the original documentation, now corrected |
| `structure`      | 44   | Text moved, merged or split                           |
| `addition`       | 43   | New material                                          |
| `formatting`     | 37   | Formatting only                                       |
| `edition-error`  | 15   | An error this edition introduced, then fixed          |
| `rejected`       | 4    | A reported error that the evidence didn't bear out    |

Each of the 178 rows that claims an error carries the five-step evidence check. 158 of them are rated high confidence and 20 medium.

## Progress the site can show from git

The front page's progress bar counts each guide, manual page and contributor document twice: once when it's sharded and once when it's reviewed. All 152 units are sharded, and 19 are reviewed, which gives 56%. The 133 manual pages make up most of the remainder, because they haven't had an editorial review. `site/scripts/migration-history.mjs verify` recomputes every row of the history from the merge commits, and CI runs it.

## Checks that stay with the repository

Each mistake recorded in the lessons-learned appendix left a check behind, so the same mistake fails a build next time:

- [`site/scripts/check-rendered.mjs`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/site/scripts/check-rendered.mjs) fails the site build when a page shows stray `**` or a written-out `<strong>` or `<em>` tag. It found 1,491 places before the fix.
- [`site/scripts/errata.mjs`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/site/scripts/errata.mjs) fails the build when an error row lacks its evidence or its verdict isn't `matches`.
- [`site/scripts/check-listings.mjs`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/site/scripts/check-listings.mjs) fails on a listing line longer than 77 columns.
- The example build compiles and runs every complete C program in the guides, and flags any that doesn't exit cleanly.

## What it cost

The agent's own usage report, kept in [`site/data/migration.json`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/site/data/migration.json), covers the session from the survey on 2026-11-12 through pull request #45 on 2026-11-15. The pull requests merged after it, including the review batches, aren't counted, so the totals understate the whole migration.

| Measure            | Value                       |
| ------------------ | --------------------------- |
| Agent working time | 10.2 hours                  |
| Maintainer time    | 3.2 hours, over 63 messages |
| Cost               | US$184.77                   |
| Output tokens      | 1.45 million                |
| Cache reads        | 568 million tokens          |

These figures come from the agent's report and can't be recomputed from the repository.

## Changes back in Merlon Docs

The trial found gaps in Merlon Docs itself, and Merlon Docs 1.2.0 shipped the fixes:

- The `html` reader, so `merlon check --no-compile` and `merlon review --no-compile` can read hand-written HTML such as ncurses' `doc/html`.
- `.so` includes in the `man` reader, so a manual page split into fragments is checked as one page.
- The `MerlonDocs.UnformattedCode` Vale rule, which flags a function name such as `set_field_fore()` written outside backticks.
- The five-step [evidence check](../../glossary/evidence-check.md) in the skill's doc-review workflow, taken from the errata's own check.
