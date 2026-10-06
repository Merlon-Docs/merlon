# Monolith link lint

How link lint checks the [monolith](../glossary/monolith.md), which holds a copy of every guide without `compile.outputFile`. [Link validation](./link-validation.md) covers the checks that every compiled output gets. Tests in `packages/mdcp-core/test/links.test.ts` and `packages/mdcp-cli/test/cli.smoke.test.ts` map to the sections below.

## Links in a guide's copy

Link lint checks the monolith as a document of its own. A link in a guide's copy there is checked against the headings of the whole monolith and the section slugs of every copy, the set compile marked each copy against. A section slug is the slug a copy gives a shard's section, such as a `FIND-*` finding id or a declared `{#id}`. Each copy takes that one set. So what passes doesn't depend on a shard's owner or on the order of `compileOrder`.

A link from another output to the monolith passes only on a heading of the monolith. A finding id or a declared `{#id}` isn't one, because the heading takes its anchor from its text. So when guide b's copy stitches `FIND-002.md`, a `#find-002` link in guide a's copy passes, and `guides.md#find-002` from a publish output is a dead anchor.

A monolith issue is left out when that guide's compiled guide reports the same link, with a matching kind and label and a target that matches as written or as the resolved file. Resolved files count because each file rebases paths relative to itself. Link issues match one for one, so each compiled guide issue leaves out at most one monolith issue. Both files keep the lines of the guide's text, so a monolith issue is matched first to an issue at the same line of that text. An issue left then takes a match on another line, which finds a link whose line a hook moved. That match skips a compiled guide issue when a monolith issue with its label is at its own line, because the issue belongs to the link on that line. Each copy after the first ends with one more blank line in the monolith, and link lint counts it when it finds the line a copy starts on. Link lint reports a monolith issue that stays under the guide whose copy holds its line. The issue sets `inMonolith`, so its diagnostic names that guide's copy, `(guide "a" in the monolith)`, and not its compiled guide.

A stale `#fragment` on a link to another guide in the monolith is reported once for each file, because the two files hold different targets. The linking guide's compiled guide keeps the link, such as `a.md#nope`, and link lint reports it as a dead anchor there. The monolith turns the same link into `#nope`. Compile marks it there, or leaves it when `compile.links.markBroken` is `false`, and link lint reports it for the monolith in both cases.

## Markers in a guide's copy

A BROKEN LINK marker in a guide's copy is reported when that guide's compiled guide has no marker of the same text. Markers also match one for one, by their own text, because the rest of a marker's line can differ between the two files. A marker is matched first to a marker at the same line of the guide's text, as a link issue is. So of two markers with the same text, the one that only the monolith holds is reported. A link gets the same marker in both files, because compile takes each marker's original target from the shard link at the same place.

## Monolith link lint acceptance criteria

- Link lint reports a link issue in the monolith, at its line there, when the guide's compiled guide doesn't report the same link
- A link in a guide's copy passes on the section slug of any copy in the monolith, such as the `FIND-*` id of a finding that another copy stitches
- Link lint reports a monolith issue under the guide whose copy holds its line, the first line of a copy included
- A monolith issue's diagnostic names the guide's copy in the monolith, not the guide's compiled guide
- A link issue in both a compiled guide and the monolith is reported once, for the compiled guide, when its target matches as written or as the file it resolves to
- Link lint matches a link issue in the monolith only against the compiled guide of the guide whose copy holds it
- Each link issue in a compiled guide leaves out at most one monolith issue, so a second link with the same label is still reported for the monolith
- Of two links with the same label, the compiled guide issue at the same line of the text leaves out the monolith issue, and the other link's monolith issue is reported
- A monolith issue still matches a compiled guide issue on another line when a hook changes the lines of the copy
- A compiled guide issue leaves out no monolith issue on another line when a monolith issue with its label is at its own line, even when the other issue's target matches
- A monolith link issue is reported when the compiled guide reports the same written target with another kind, such as `missing publish path` against `dead anchor`
- A link to a shard of a guide in the monolith is a dead anchor there when the monolith has no section for that shard and no other heading or section there has the slug the link takes
- Link lint reports a BROKEN LINK marker that appears only in the monolith
- A stale `#fragment` on a link to another guide in the monolith is reported for the linking guide's compiled guide and for the monolith
- A BROKEN LINK marker that appears in both a compiled guide and the monolith is reported once, for the compiled guide, even when the rest of its line differs between the two files
- Link lint matches a marker in the monolith only against the compiled guide of the guide whose copy holds it
- Of two markers with the same text in a guide's copy, link lint reports the one at the line where the compiled guide has no marker
- A copy accepts the same section slugs whichever guide is the shard's owner, a publish-only guide included, and whatever the order of `compileOrder`, with `compile.links.markBroken` `true` or `false`
- Link lint finds the guide's copy that holds a line of the monolith for the third guide there and every guide after it
- Of two links with the same label in a guide's copy, link lint reports the monolith marker of the link that only the monolith marks

## Monolith link lint related

- [Link validation](./link-validation.md)
- [Cross-guide link rewriting](../client-core/compile-hooks/cross-guide-links.md)
