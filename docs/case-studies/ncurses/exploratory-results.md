# What the ncurses trial explored

<!-- merlon-paths: illustrative -->

Some of the work was exploratory: running Merlon Docs on a tree it had never read, and checking the checks. This page records what those runs found, including the ones that didn't work.

## Checking the man pages before any change

The survey ran `merlon check --no-compile` with the `man` reader on all 133 pages of the untouched tree. It passed in 0.2 seconds with 59 warnings:

- 49 warnings name `terminfo(5)`, a page that only exists after the build runs `MKterminfo.sh`.
- 2 were real: `infocmp(1)` and `tic(1)` should be section 1M.
- 2 were false positives in the reader: `attrset(0)` and `mouseinterval(0)` are C calls set in bold, not page references. Merlon Docs 1.2.0 no longer reads them as references.

When the migration checked every page reference by hand, it found seven wrong sections in six pages, not two. Five are written with the autoconf placeholders `@TIC@` and `@INFOCMP@`, which a search for the program names missed. With 1.2.0, `merlon check --no-compile` reports the same seven.

## Reading the HTML guides

No HTML reader existed when the survey started, so one was built on a branch and tried on the six hand-written pages in `doc/html`. Check found no orphans or broken links. Review, with Merlon Docs' defaults, reported 34 findings: 4 pages over 2,500 words, and 30 paragraphs repeated between the HOWTO's forms chapter and the forms section of _Writing Programs with NCURSES_. That finding is why the migration merged the two into one forms guide. The reader shipped in 1.2.0.

## Checking the sharded tree

On the migrated tree at commit `568319e`, this command reads 1,343 documents, Markdown and troff together, in about half a second:

```bash
merlon check --no-compile --config docs/merlon.config.json --docs-root docs --skip-vale
```

It reports 55 warnings, 49 of them for `terminfo(5)` again, and one issue. The issue is an include in a fragment two directories deep, `.so common/no-size-restrictions.1m`. troff resolves that path from the `man/` directory and finds the file. Merlon Docs looks next to the including file, under the docs root, and in the parent directory, and none of those holds it. That's a gap in the reader, not in the docs.

## Survey findings are claims too

The survey's `merlon review --no-compile` run reported repeated paragraphs and a repeated title in the manual pages. Checking each one showed text shared on purpose, such as between the narrow-character and wide-character pages `curs_bkgd` and `curs_bkgrnd`, and two different pages that share the name `term`, in sections 5 and 7. All four findings became `rejected` errata rows. Merlon Docs 1.2.0 titles a manual page by name and section, so `term(5)` and `term(7)` no longer read as a clash. A survey, like any review, makes claims that need the evidence check before anyone acts on them.

## Verifying the errata from outside

To test whether the errata's own verdicts hold, the 178 error claims were split into six batches and sent to an outside system, three independent runs a batch, with no access to the errata or to each other's answers. The first attempt didn't produce a result: safety-filter stops ended all but 1 of the 18 runs. A second attempt is pending, and this page will be superseded when it reports.
