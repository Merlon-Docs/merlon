# How the ncurses migration is running

<!-- merlon-paths: illustrative -->

> **Status: in progress.** The ncurses migration is still under way. Every figure here is an interim reading, taken on 2026-11-15 from the ncurses repository at commit `568319e`, and will change as the work goes on. Nothing on this page is a final result.

The migration has run in five stages so far. Each stage merged as its own pull requests, and the maintainer reviewed each pull request before it merged. The editorial review of the manual pages is the next stage, and hasn't started.

## Survey the existing docs

Before any file moved, a survey listed every documentation file in the tree, its format, and whether it was source or generated. Many files are build output: the HTML manual pages come from troff by `man2html`, and the text dumps in `doc/` come from the HTML. Only the sources moved. The survey also ran `merlon check --no-compile` and `merlon review --no-compile` on the untouched tree, which [What the ncurses trial has explored so far](./exploratory-results.md) describes.

## Shard the docs

Each source went to a shard directory under `docs/`, in a format that suits it:

- **Manual pages** stay troff. Each page became a short file that includes one fragment for each section with `.so`, the way `soelim` and `man` read includes. Text shared by several pages became one fragment under [`docs/man/common/`](https://github.com/betsalel-williamson/ncurses/tree/568319e5809ad365ba195ebbd100946c53b42cb4/docs/man/common).
- **Guides** became Markdown shards under [`docs/client-library/`](https://github.com/betsalel-williamson/ncurses/tree/568319e5809ad365ba195ebbd100946c53b42cb4/docs/client-library), one directory for each topic, and each guide was checked against its sources as it moved. The HOWTO's forms chapter and the forms section of _Writing Programs with NCURSES_ were merged into one forms guide, because the HOWTO had copied that material.
- **Contributor docs**, which are the hacker's guide, `INSTALL` (with `README.MinGW` and `README.emx`), the Ada95 guide and the release announcement, went under [`docs/contributor/`](https://github.com/betsalel-williamson/ncurses/tree/568319e5809ad365ba195ebbd100946c53b42cb4/docs/contributor).
- **A glossary** of 22 curses terms and **an appendix** for the errata and lessons learned were added.

[`docs/merlon.config.json`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/docs/merlon.config.json) lists both formats under `sources` and names a root for each guide, so `merlon check --no-compile` reads the Markdown and the troff as one tree.

## Record every change in the errata

Every change to the text has a row in [`docs/appendix/errata.csv`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/docs/appendix/errata.csv): an error in the original, an error this edition introduced, formatting, structure, or new material. A row that claims an error carries the [evidence check](../../glossary/evidence-check.md): the claim as printed, what was opened, a quote of it, a verdict with its confidence, and what would have been concluded one step earlier. A claim the evidence doesn't bear out moves to `rejected`, so a finding is never dropped without a record.

The site's workflow fails a pull request that changes the docs without adding errata rows, unless it carries the `no-errata` label. A build script fails when an error row lacks the five fields or its verdict isn't `matches`.

## Build the site

The site is Astro Starlight, generated from the shards. Beyond the pages themselves, it adds:

- A Run button on every complete C program in the guides. The program is compiled to WebAssembly with Emscripten and runs in an xterm.js terminal on the page.
- Code hints: each library call in a listing links to its manual page and shows the function's declaration.
- Five reader styles, from Starlight's own to one set like a printed manual page.
- A migration progress bar that counts from git, so anyone with a clone can check it.

## Review each guide against the source

Once everything was sharded, a review pass checked each guide and contributor document against the library's headers, its source and its manual pages, in five batches: pull requests #54, #55, #56, #57 and #59. So far the batches have corrected 28 errors, recorded as errata rows: 22 in the original text and 6 that this edition had introduced. Phone layout work ran alongside the review: the load flash and the copy button (#51), the header (#47, #48), the search dialog (#58), code hints that open on tap, and a search field that rotates example searches (#60).

Each mistake in the migration itself went into the [lessons learned](https://github.com/betsalel-williamson/ncurses/blob/master/docs/appendix/lessons-learned.md) appendix, with its cause and the check that now catches it.
