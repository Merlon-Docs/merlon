/**
 * Table re-alignment, the last compile step: tests driven by
 * docs/client-core/compile-hooks/tables-after-link-rewriting.md. Each expected table is the one
 * Prettier prints for the same rows.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { realignTables } from '../src/compile/align-tables.js';
import { assembleGuide, compileGuideResults } from '../src/compile/assemble.js';
import { createLocalePack } from '../src/locale/index.js';
import { timeMs } from './helpers/redos-pumps.js';
import { withTmpDir } from './helpers/tmp-dir.js';

const lines = (...rows: string[]) => rows.join('\n');

/** `text` with `marker` before each line, as a list item indents it or a blockquote quotes it. */
const prefix = (marker: string, text: string) =>
  text
    .split('\n')
    .map((row) => `${marker}${row}`)
    .join('\n');

/** A shard table as Prettier aligns it, with links whose targets compile rewrites. */
const SHARD_TABLE = lines(
  '| Page                                  | Purpose    |',
  '| ------------------------------------- | ---------- |',
  '| [Setup](./setup-and-configuration.md) | Install it |',
  '| [Usage](./usage.md)                   | Run it     |',
);

/** The same table once compile rewrites both links to anchors, before re-alignment. */
const REWRITTEN_TABLE = SHARD_TABLE.replace(
  './setup-and-configuration.md',
  '#setup-and-configuration',
).replace('./usage.md', '#usage');

const REALIGNED_TABLE = lines(
  '| Page                              | Purpose    |',
  '| --------------------------------- | ---------- |',
  '| [Setup](#setup-and-configuration) | Install it |',
  '| [Usage](#usage)                   | Run it     |',
);

describe('realignTables', () => {
  it('narrows a column when compile shortens its links', () => {
    expect(realignTables(`Intro.\n\n${REWRITTEN_TABLE}\n\nAfter.\n`)).toBe(
      `Intro.\n\n${REALIGNED_TABLE}\n\nAfter.\n`,
    );
  });

  it('widens a column when compile lengthens a link', () => {
    const shard = lines(
      '| Term     | See               |',
      '| -------- | ----------------- |',
      '| Glossary | [Index](#index)   |',
      '| Refs     | [Registry](#refs) |',
    );
    expect(realignTables(shard.replace('(#index)', '(../../docs/glossary/index.md)'))).toBe(
      lines(
        '| Term     | See                                   |',
        '| -------- | ------------------------------------- |',
        '| Glossary | [Index](../../docs/glossary/index.md) |',
        '| Refs     | [Registry](#refs)                     |',
      ),
    );
  });

  it('keeps each column alignment and pads the cells as Prettier does', () => {
    const shard = lines(
      '| Left                  |          Right |        Center         |',
      '| :-------------------- | -------------: | :-------------------: |',
      '| [a](./alpha-guide.md) | [b](./beta.md) | [c](./gamma-guide.md) |',
      '| x                     |              y |           z           |',
    );
    const rewritten = shard
      .replace('./alpha-guide.md', '#alpha-guide')
      .replace('./beta.md', '#beta')
      .replace('./gamma-guide.md', '#gamma-guide');
    expect(realignTables(rewritten)).toBe(
      lines(
        '| Left              |      Right |      Center       |',
        '| :---------------- | ---------: | :---------------: |',
        '| [a](#alpha-guide) | [b](#beta) | [c](#gamma-guide) |',
        '| x                 |          y |         z         |',
      ),
    );
  });

  it('leaves an aligned table as it is', () => {
    expect(realignTables(SHARD_TABLE)).toBe(SHARD_TABLE);
    expect(realignTables(REALIGNED_TABLE)).toBe(REALIGNED_TABLE);
  });

  it('leaves a compact table compact', () => {
    const compact = lines(
      '| Page | Purpose |',
      '| --- | --- |',
      '| [Setup](#setup-and-configuration) | Install it |',
      '| [Usage](#usage) | Run it |',
    );
    expect(realignTables(compact)).toBe(compact);
  });

  it('leaves a compact table compact when its cells without a link fill the delimiter row', () => {
    const compact = lines('| Key |', '| --- |', '| [Setup](#setup-and-configuration) |');
    expect(realignTables(compact)).toBe(compact);
  });

  it('reads an empty cell padded past one space as aligned', () => {
    // Each cell with text fills its column, so only the empty cell shows that Prettier aligned it.
    const shard = lines(
      '| Reference link to a guide | Note |',
      '| ------------------------- | ---- |',
      '| [Local](./local-setup.md) |      |',
    );
    expect(realignTables(shard.replace('./local-setup.md', '#local-setup'))).toBe(
      lines(
        '| Reference link to a guide | Note |',
        '| ------------------------- | ---- |',
        '| [Local](#local-setup)     |      |',
      ),
    );
  });

  it('leaves a tight table tight', () => {
    const tight = lines('|Page|Purpose|', '|---|---|', '|[Setup](#setup)|Install it|');
    expect(realignTables(tight)).toBe(tight);
  });

  it('leaves a table the shard did not align', () => {
    // The second column holds no link, so compile did not move its pipe.
    const ragged = lines(
      '| Page                              | Purpose |',
      '| --------------------------------- | ------- |',
      '| [Setup](#setup-and-configuration) | Install it |',
      '| [Usage](#usage) | Run it  |',
    );
    expect(realignTables(ragged)).toBe(ragged);
  });

  it('keeps an escaped pipe, in a code span or out of one, inside its cell', () => {
    const shard = lines(
      '| Syntax   | Meaning                   |',
      '| -------- | ------------------------- |',
      '| `a \\| b` | [Either](./either-one.md) |',
      '| a \\| b   | Both                      |',
    );
    expect(realignTables(shard.replace('./either-one.md', '#either-one'))).toBe(
      lines(
        '| Syntax   | Meaning               |',
        '| -------- | --------------------- |',
        '| `a \\| b` | [Either](#either-one) |',
        '| a \\| b   | Both                  |',
      ),
    );
  });

  it('counts wide characters and emoji as two columns and combining marks as none', () => {
    const shard = lines(
      '| 名前    | Link                    |',
      '| ------- | ----------------------- |',
      '| 中文 🚀 | [Docs](./docs-index.md) |',
      '| Café    | ✅ done                 |',
    );
    expect(realignTables(shard.replace('./docs-index.md', '../../docs/guides/docs-index.md'))).toBe(
      lines(
        '| 名前    | Link                                    |',
        '| ------- | --------------------------------------- |',
        '| 中文 🚀 | [Docs](../../docs/guides/docs-index.md) |',
        '| Café    | ✅ done                                 |',
      ),
    );
  });

  it('keeps each column three characters wide at least', () => {
    const shard = lines(
      '| #   | Page                |',
      '| --- | ------------------- |',
      '| 1   | [Setup](./setup.md) |',
    );
    expect(realignTables(shard.replace('./setup.md', '#setup'))).toBe(
      lines('| #   | Page            |', '| --- | --------------- |', '| 1   | [Setup](#setup) |'),
    );
  });

  it('re-aligns a row with fewer cells than the delimiter row', () => {
    const shard = lines(
      '| Page                | Purpose |',
      '| ------------------- | ------- |',
      '| [Setup](./setup.md) |',
      '| Usage               | Run it  |',
    );
    expect(realignTables(shard.replace('./setup.md', '#setup'))).toBe(
      lines(
        '| Page            | Purpose |',
        '| --------------- | ------- |',
        '| [Setup](#setup) |',
        '| Usage           | Run it  |',
      ),
    );
  });

  it('keeps CRLF line endings', () => {
    const crlf = (table: string) => `${table.replace(/\n/g, '\r\n')}\r\n`;
    expect(realignTables(crlf(REWRITTEN_TABLE))).toBe(crlf(REALIGNED_TABLE));
  });

  it('re-aligns a table whose link became a broken-link marker', () => {
    const shard = lines(
      '| Page          | Purpose    |',
      '| ------------- | ---------- |',
      '| [Gone](#gone) | Removed    |',
      '| Kept          | Still here |',
    );
    const marker = '**BROKEN LINK:** "Gone" (`#gone`) → `#gone` (dead anchor in compiled guide)';
    expect(realignTables(shard.replace('[Gone](#gone)', marker))).toBe(
      lines(
        '| Page                                                                        | Purpose    |',
        '| --------------------------------------------------------------------------- | ---------- |',
        `| ${marker} | Removed    |`,
        '| Kept                                                                        | Still here |',
      ),
    );
  });

  it('reads the broken-link markers of the locale it is given', () => {
    const locale = createLocalePack({
      id: 'x-test',
      brokenLinks: {
        markerLabel: 'LINK ALERT',
        markerTemplate: '[{markerLabel}] {label}: {originalTarget} => {brokenTarget} ({reason})',
        reasonDeadAnchor: 'dead anchor',
        reasonMissingFile: 'missing file',
        reasonMissingPublishPath: 'missing publish path',
      },
      inserts: { seeInsertFallback: 'Open insert' },
    });
    const shard = lines(
      '| Page          | Purpose    |',
      '| ------------- | ---------- |',
      '| [Gone](#gone) | Removed    |',
      '| Kept          | Still here |',
    );
    const marker = locale.brokenLinks.formatMarker('Gone', '#gone', '#gone', 'dead anchor');
    const marked = shard.replace('[Gone](#gone)', marker);
    // The en-US default finds no link and no marker of its own in the cell, so it leaves the table.
    expect(realignTables(marked)).toBe(marked);
    expect(realignTables(marked, { locale })).toBe(
      lines(
        '| Page                                            | Purpose    |',
        '| ----------------------------------------------- | ---------- |',
        `| ${marker} | Removed    |`,
        '| Kept                                            | Still here |',
      ),
    );
  });

  it('re-aligns a table indented under a list item and keeps its indentation', () => {
    const indent = (table: string) =>
      table
        .split('\n')
        .map((row) => `  ${row}`)
        .join('\n');
    expect(realignTables(`- Pages:\n\n${indent(REWRITTEN_TABLE)}\n`)).toBe(
      `- Pages:\n\n${indent(REALIGNED_TABLE)}\n`,
    );
  });

  it('re-aligns a table whose header row starts on the line of its list marker', () => {
    // Prettier prints a table that opens a list item on the marker's line, and the other rows take
    // the item's indentation, which is as wide as the marker.
    const item = (marker: string, indent: string, table: string) => {
      const [header, ...rest] = table.split('\n');
      return lines(`${marker}${header}`, prefix(indent, lines(...rest)), '');
    };
    const items: [string, string][] = [
      ['- ', '  '],
      ['1. ', '   '],
      ['10) ', '    '],
      ['- - ', '    '],
      ['- > ', '  > '],
      ['> - ', '>   '],
    ];
    for (const [marker, indent] of items) {
      expect(realignTables(item(marker, indent, REWRITTEN_TABLE))).toBe(
        item(marker, indent, REALIGNED_TABLE),
      );
    }
    // A tight list whose items each open with a table.
    const list = (table: string) => lines(item('- ', '  ', table), item('- ', '  ', table), '');
    expect(realignTables(list(REWRITTEN_TABLE))).toBe(list(REALIGNED_TABLE));
    // A header row that opens a list item continues no paragraph, even the text of a nested item
    // right above it, which is indented further.
    const afterNested = (table: string) =>
      lines('- First:', '  - Nested text', item('- ', '  ', table));
    expect(realignTables(afterNested(REWRITTEN_TABLE))).toBe(afterNested(REALIGNED_TABLE));
    // The other rows are indented less or more than the marker is wide.
    for (const indent of [' ', '   ']) {
      const shifted = item('- ', indent, REWRITTEN_TABLE);
      expect(realignTables(shifted)).toBe(shifted);
    }
  });

  it('ends a table at a line that opens another block, as in a tight list', () => {
    const cases: [string, string, string][] = [
      ['- Pages:', '  ', '- Then run it.'],
      ['1. Pages:', '   ', '2. Then run it.'],
      ['- Pages:', '  ', '  - Nested item'],
      ['- Pages:', '  ', '  3. Nested item'],
      ['- Pages:', '  ', '  -'],
      ['> - Pages:', '>   ', '> - Then run it.'],
      ['- Pages:', '  ', '  ## Heading'],
      ['- Pages:', '  ', '  > Quote'],
      ['- Pages:', '  ', '  ***'],
      ['- Pages:', '  ', '  ---'],
      ['- Pages:', '  ', '  ___'],
      ['- Pages:', '  ', '  <!-- Note -->'],
      ['- Pages:', '  ', '  <pre class="x">mdcp compile</pre>'],
      ['- Pages:', '  ', '  <p>Read this first.</p>'],
      ['- Pages:', '  ', '  <details>'],
      ['- Pages:', '  ', '  <img src="flow.png" alt="Flow" />'],
      ['- Pages:', '  ', '  </span>'],
    ];
    for (const [before, indent, after] of cases) {
      const item = (table: string) => lines(before, prefix(indent, table), after, '');
      expect(realignTables(item(REWRITTEN_TABLE))).toBe(item(REALIGNED_TABLE));
    }
    // A tight list whose items each hold a table.
    const list = (table: string) =>
      lines('- First:', prefix('  ', table), '- Second:', prefix('  ', table), '');
    expect(realignTables(list(REWRITTEN_TABLE))).toBe(list(REALIGNED_TABLE));
    // With CRLF line endings, the `\r` before the end of the line doesn't hide the block.
    const crlf = (table: string) =>
      lines('- Pages:', prefix('  ', table), '  ***', '- Then run it.', '').replace(/\n/g, '\r\n');
    expect(realignTables(crlf(REWRITTEN_TABLE))).toBe(crlf(REALIGNED_TABLE));
  });

  it('ends a quoted table at a line that leaves the blockquote or opens a nested one', () => {
    // The first three rows of REALIGNED_TABLE are the three-row table as Prettier prints it.
    const [, , , usage] = REWRITTEN_TABLE.split('\n');
    const head = (table: string) => prefix('> ', lines(...table.split('\n').slice(0, 3)));
    for (const after of [usage, 'After the quote.', `> > ${usage}`]) {
      const quote = (table: string) => lines(head(table), after, '');
      expect(realignTables(quote(REWRITTEN_TABLE))).toBe(quote(REALIGNED_TABLE));
    }
  });

  it('leaves a table that a line without pipes continues', () => {
    // GFM reads the line as one more row of the table, with no pipes to line up.
    for (const after of ['  More text.', '  <span>More</span> text.']) {
      const item = lines('- Pages:', prefix('  ', REWRITTEN_TABLE), after, '');
      expect(realignTables(item)).toBe(item);
    }
    // Compile reads no block in a list item marker indented past the rows, so the table stays too.
    const deeper = lines('- Pages:', prefix('  ', REWRITTEN_TABLE), '      - Indented item', '');
    expect(realignTables(deeper)).toBe(deeper);
  });

  it('leaves a table whose header row may continue a paragraph from outside its container', () => {
    // GFM reads no table there. The rows continue the paragraph of the list item or blockquote
    // above, so a delimiter row further down starts no table either.
    const [header, delimiter, setup, usage] = REWRITTEN_TABLE.split('\n');
    const lazy = [
      lines('- Pages:', REWRITTEN_TABLE, ''),
      lines('> Pages:', REWRITTEN_TABLE, ''),
      lines('- Pages:', '  - Nested:', prefix('  ', REWRITTEN_TABLE), ''),
      lines('- Pages:', header, delimiter, setup, delimiter, usage, ''),
    ];
    for (const text of lazy) expect(realignTables(text)).toBe(text);
    // A header row that opens a blockquote starts a table.
    const quoted = (table: string) => lines('- Pages:', prefix('> ', table), '');
    expect(realignTables(quoted(REWRITTEN_TABLE))).toBe(quoted(REALIGNED_TABLE));
  });

  it('re-aligns a table inside a blockquote and keeps its markers', () => {
    // A quote, a quote with no space after its marker, a nested quote and a quote in a list item.
    const quotes: [string, string][] = [
      ['Intro.', '> '],
      ['Intro.', '>'],
      ['Intro.', '> > '],
      ['- Pages:', '  > '],
    ];
    for (const [before, marker] of quotes) {
      const quote = (table: string) => `${before}\n\n${prefix(marker, table)}\n\nAfter.\n`;
      expect(realignTables(quote(REWRITTEN_TABLE))).toBe(quote(REALIGNED_TABLE));
    }
  });

  it('ends a quoted table at a blank line inside the blockquote', () => {
    const callout = (table: string) =>
      lines('> **Note:** these pages.', '>', prefix('> ', table), '>', '> More text.', '');
    expect(realignTables(callout(REWRITTEN_TABLE))).toBe(callout(REALIGNED_TABLE));
  });

  it('never touches a table inside fenced code in a blockquote', () => {
    const quoted = lines(
      prefix('> ', lines('```markdown', REWRITTEN_TABLE, '```')),
      '>',
      prefix('> ', REWRITTEN_TABLE),
      '>',
      prefix('> ', lines('- Example:', '', prefix('  ', lines('```', REWRITTEN_TABLE, '```')))),
      '',
    );
    expect(realignTables(quoted)).toBe(
      quoted.replace(
        `>\n${prefix('> ', REWRITTEN_TABLE)}\n>`,
        `>\n${prefix('> ', REALIGNED_TABLE)}\n>`,
      ),
    );
    // A fence the quote leaves open ends with the quote, so the table after it is prose.
    const unclosed = (table: string) =>
      lines(prefix('> ', lines('```', REWRITTEN_TABLE)), '', table, '');
    expect(realignTables(unclosed(REWRITTEN_TABLE))).toBe(unclosed(REALIGNED_TABLE));
    // The one space after a quote marker belongs to the marker, so the fence is indented three.
    const spaced = lines('>    ```', '>', prefix('> ', REWRITTEN_TABLE), '>', '>    ```', '');
    expect(realignTables(spaced)).toBe(spaced);
    // A fence in the outer quote holds lines that look like a nested quote.
    const outer = lines('> ```', prefix('> > ', REWRITTEN_TABLE), '> ```', '');
    expect(realignTables(outer)).toBe(outer);
  });

  it('reads a fence that opens a blockquote on the line of a list marker', () => {
    // Prettier prints a list item that opens with a blockquote on the marker's line, as `- > `,
    // and a fence that opens the quote goes on that line too.
    const fences: [string, string][] = [
      ['- > ', '  > '],
      ['1. > ', '   > '],
      ['> - > ', '>   > '],
      ['- > > ', '  > > '],
      ['- > - ', '  >   '],
    ];
    for (const [marker, indent] of fences) {
      const code = lines(
        `${marker}\`\`\`markdown`,
        prefix(indent, REWRITTEN_TABLE),
        `${indent}\`\`\``,
        '',
      );
      expect(realignTables(code)).toBe(code);
    }
    // The fence closes before the table, so the table is prose.
    const items: [string, string][] = [
      ['1. > ', '   > '],
      ['- > ', '  > '],
      ['> - > ', '>   > '],
    ];
    for (const [marker, indent] of items) {
      const item = (table: string) =>
        lines(
          `${marker}\`\`\`sh`,
          `${indent}mdcp compile`,
          `${indent}\`\`\``,
          indent.trimEnd(),
          prefix(indent, table),
          '',
        );
      expect(realignTables(item(REWRITTEN_TABLE))).toBe(item(REALIGNED_TABLE));
    }
    // A fence the quote leaves open ends with it, so the next item's quote holds prose.
    const unclosed = (table: string) =>
      lines('- > ```sh', '  > mdcp compile', '- > Pages:', '  >', prefix('  > ', table), '');
    expect(realignTables(unclosed(REWRITTEN_TABLE))).toBe(unclosed(REALIGNED_TABLE));
  });

  it('reads a table in an indented code block or an HTML block as prose, as link rewriting does', () => {
    const indented = (table: string) => lines('Example:', '', prefix('    ', table), '');
    expect(realignTables(indented(REWRITTEN_TABLE))).toBe(indented(REALIGNED_TABLE));
    const pre = (table: string) => lines('<pre>', table, '', '</pre>', '');
    expect(realignTables(pre(REWRITTEN_TABLE))).toBe(pre(REALIGNED_TABLE));
    const comment = (table: string) => lines('<!--', '', table, '', '-->', '');
    expect(realignTables(comment(REWRITTEN_TABLE))).toBe(comment(REALIGNED_TABLE));
    // A closing line right after the last row reads as one more row, with no pipes to line up.
    const closed = lines('<!--', '', REWRITTEN_TABLE, '-->', '');
    expect(realignTables(closed)).toBe(closed);
  });

  it('never touches a table inside fenced code', () => {
    // Compile rewrote the header's link too, so the header and delimiter rows alone are out of line.
    const rewritten = lines(
      '| [Pages](#pages)                   | Purpose    |',
      '| ------------------------------------- | ---------- |',
      '| [Setup](#setup-and-configuration) | Install it |',
    );
    const realigned = lines(
      '| [Pages](#pages)                   | Purpose    |',
      '| --------------------------------- | ---------- |',
      '| [Setup](#setup-and-configuration) | Install it |',
    );
    const fenced = (table: string) =>
      lines(
        '```markdown',
        table,
        '```',
        '',
        '~~~',
        table,
        '~~~',
        '',
        '- Example:',
        '',
        '  ```',
        ...table.split('\n').map((row) => `  ${row}`),
        '  ```',
      );
    expect(realignTables(`${fenced(rewritten)}\n\n${rewritten}\n`)).toBe(
      `${fenced(rewritten)}\n\n${realigned}\n`,
    );
    // A fence right after the last row ends the table.
    const fenceAfter = (table: string) => lines(table, '```', rewritten, '```', '');
    expect(realignTables(fenceAfter(rewritten))).toBe(fenceAfter(realigned));
  });

  /** A table in a list item, then a nested item whose fence shows `example`, as Prettier prints them. */
  const nestedExample = (table: string, example: string) =>
    lines(
      '- Pages:',
      '',
      prefix('  ', table),
      '  10. Example of the table in a shard:',
      '',
      '      ```markdown',
      prefix('      ', example),
      '',
      '      The link cites the guide.',
      '      ```',
      '',
      '- Next.',
      '',
    );

  it('reads a fence in a list item that ends a table, though that item could not end a paragraph', () => {
    // Prettier prints a nested list right after a table in a list item. An ordered item that starts
    // past 1 can't interrupt a paragraph, but it ends a table, so the fence in it opens.
    const numbered = (table: string) => nestedExample(table, REWRITTEN_TABLE);
    expect(realignTables(numbered(REWRITTEN_TABLE))).toBe(numbered(REALIGNED_TABLE));
    // With `tabWidth` 4, Prettier indents the item's text four columns, and its fence eight.
    const tabWidth4 = (table: string) =>
      lines(
        '- Pages:',
        '',
        prefix('    ', table),
        '    2. Example:',
        '',
        '        ~~~markdown',
        prefix('        ', REWRITTEN_TABLE),
        '',
        '        The link cites the guide.',
        '        ~~~',
        '',
        '- Next.',
        '',
      );
    expect(realignTables(tabWidth4(REWRITTEN_TABLE))).toBe(tabWidth4(REALIGNED_TABLE));
    // A table in a blockquote ends at that item too, and so does a table that opens its list item.
    const quoted = (table: string) => `${prefix('> ', numbered(table).trimEnd())}\n`;
    expect(realignTables(quoted(REWRITTEN_TABLE))).toBe(quoted(REALIGNED_TABLE));
    const opens = (table: string) => numbered(table).replace('- Pages:\n\n  |', '- |');
    expect(realignTables(opens(REWRITTEN_TABLE))).toBe(opens(REALIGNED_TABLE));
    // So does a table that compile doesn't re-align, as when its rows have no pipe at either end
    // or a row ends in spaces.
    const unaligned = [
      lines('Page | Purpose', '--- | ---', 'Setup | Install it'),
      lines('| Page | Purpose |  ', '| --- | --- |', '| Setup | Install it |'),
    ];
    for (const table of unaligned) expect(realignTables(numbered(table))).toBe(numbered(table));
  });

  it('reads no fence in that item when GFM reads no table above it', () => {
    // A header row with another number of cells, or a delimiter row four columns further in, makes
    // no table. The item continues a paragraph, so the fence in it is text and its table is read.
    const outers = [
      lines('| Page | Purpose | Notes |', '| ---- | ------- |'),
      lines('| Page | Purpose |', '    | ---- | ------- |'),
    ];
    for (const outer of outers) {
      expect(realignTables(nestedExample(outer, REWRITTEN_TABLE))).toBe(
        nestedExample(outer, REALIGNED_TABLE),
      );
    }
  });

  it('leaves a table whose rows change indentation', () => {
    const rows = REWRITTEN_TABLE.split('\n');
    const bodyOut = lines(...rows.slice(0, 3).map((row) => `  ${row}`), rows[3], '');
    const headerOut = lines(rows[0], ...rows.slice(1).map((row) => `  ${row}`), '');
    // GFM ends a list item's table at a row indented less, but that row continues a table indented
    // outside any list item, and compile reads no list item to tell the two apart.
    for (const shifted of [bodyOut, headerOut]) {
      expect(realignTables(`- Pages:\n\n${shifted}`)).toBe(`- Pages:\n\n${shifted}`);
    }
  });

  it('leaves a table whose rows do not fit its delimiter row', () => {
    const [header, ...rest] = REWRITTEN_TABLE.split('\n');
    // A row with an extra cell, a header with an extra cell, a row with no closing pipe, a table
    // with no outer pipes and a row with no leading pipe.
    const unpiped = (row: string) => row.slice(2, -2);
    const tables = [
      `${REWRITTEN_TABLE} [More](#more) |`,
      lines(`${header} [More](#more) |`, ...rest),
      REWRITTEN_TABLE.replace('Run it     |', 'Run it'),
      lines(...REWRITTEN_TABLE.split('\n').map(unpiped)),
      lines(header, rest[0], unpiped(rest[1]).trimEnd() + ' |', rest[2]),
    ];
    for (const table of tables) expect(realignTables(table)).toBe(table);
  });

  it('leaves a table with a tab as written', () => {
    const tabbed = REWRITTEN_TABLE.replace('(#usage) ', '(#usage)\t');
    expect(realignTables(tabbed)).toBe(tabbed);
  });

  it('leaves every row of a table it leaves, a row like a delimiter row included', () => {
    // GFM reads one table here, and a body row that looks like a delimiter row is one of its rows.
    const [header, delimiter, setup, usage] = REWRITTEN_TABLE.split('\n');
    const tables = [
      lines(header.replace('Page ', 'Page\t'), delimiter, setup, delimiter, usage, ''),
      lines(header, delimiter.replace(' | ', ' |\t'), setup, delimiter, usage, ''),
      lines(`  ${header}`, delimiter, setup, delimiter, usage, ''),
    ];
    for (const table of tables) expect(realignTables(table)).toBe(table);
  });

  it('leaves a table nested in more than ten blockquotes as written', () => {
    const nested = (depth: number, table: string) => lines(prefix('> '.repeat(depth), table), '');
    expect(realignTables(nested(10, REWRITTEN_TABLE))).toBe(nested(10, REALIGNED_TABLE));
    expect(realignTables(nested(11, REWRITTEN_TABLE))).toBe(nested(11, REWRITTEN_TABLE));
  });

  it('stays under budget on tables in deeply nested blockquotes', () => {
    // Finding the fences of each quote around a table takes time that grows with the square of
    // its depth, so compile reads tables in ten blockquotes at most.
    const tables = Array.from({ length: 100 }, () => REWRITTEN_TABLE).join('\n\n');
    const deep = prefix('> '.repeat(300), tables);
    expect(timeMs(() => realignTables(deep))).toBeLessThan(50);
  });
});

describe('compile re-aligns tables', () => {
  function writeGuide(work: string): string {
    const guideDir = join(work, 'guide');
    mkdirSync(guideDir, { recursive: true });
    mkdirSync(join(work, 'config'), { recursive: true });
    writeFileSync(join(work, 'config', 'settings.json'), '{}\n');
    writeFileSync(
      join(guideDir, 'index.md'),
      '# Guide\n\n- [Overview](./overview.md)\n- [Setup](./setup-and-configuration.md)\n',
    );
    writeFileSync(
      join(guideDir, 'overview.md'),
      lines(
        '# Overview',
        '',
        '| Page                                  | Purpose         |',
        '| ------------------------------------- | --------------- |',
        '| [Setup](./setup-and-configuration.md) | Install it      |',
        '| [Settings](../config/settings.json)   | Defaults        |',
        '| [Gone](#gone)                         | Removed heading |',
        '',
      ),
    );
    writeFileSync(join(guideDir, 'setup-and-configuration.md'), '# Setup and configuration\n');
    return guideDir;
  }

  const COMPILED_TABLE = lines(
    '| Page                                                                        | Purpose         |',
    '| --------------------------------------------------------------------------- | --------------- |',
    '| [Setup](#setup-and-configuration)                                           | Install it      |',
    '| [Settings](config/settings.json)                                            | Defaults        |',
    '| **BROKEN LINK:** "Gone" (`#gone`) → `#gone` (dead anchor in compiled guide) | Removed heading |',
  );

  it('re-aligns a table after link rewriting and broken-link marking', () => {
    withTmpDir('mdcp-align-tables-', (work) => {
      const guideDir = writeGuide(work);
      const out = assembleGuide(guideDir, {
        outputFile: join(work, 'guide.md'),
        publishOutputFile: join(work, 'guide.md'),
      });
      expect(out).toContain(`\n\n${COMPILED_TABLE}\n\n`);
    });
  });

  it('re-aligns the table in the compiled guide and in the monolith', () => {
    withTmpDir('mdcp-align-tables-', (work) => {
      writeGuide(work);
      const [result] = compileGuideResults({
        guidesRoot: work,
        compileOrder: ['guide'],
        docsRoot: work,
        config: { compileOrder: ['guide'], outputDir: '.', outputFile: 'all.md' },
      });
      expect(result.text).toContain(`\n\n${COMPILED_TABLE}\n\n`);
      expect(result.monolithText).toContain(`\n\n${COMPILED_TABLE}\n\n`);
    });
  });
});
