import { describe, it, expect } from 'vitest';
import { stripExplicitAnchorMarkers } from '../src/compile/anchors.js';

const strip = (lines: string[]): string => stripExplicitAnchorMarkers(lines.join('\n'));

describe('stripExplicitAnchorMarkers', () => {
  it('removes brace ids from headings', () => {
    const out = stripExplicitAnchorMarkers('## Architecture review {#review-index}\n');
    expect(out).toBe('## Architecture review\n');
  });

  it('removes a brace id that ends a heading or a prose line', () => {
    expect(stripExplicitAnchorMarkers('## Real {#real-id}')).toBe('## Real');
    expect(stripExplicitAnchorMarkers('text {#x}.')).toBe('text.');
  });

  it('keeps brace ids inside single-backtick code spans', () => {
    const line = 'Quote `{#custom-id}` and `## H {#id}` in prose.';
    expect(stripExplicitAnchorMarkers(line)).toBe(line);
  });

  it('keeps brace ids inside double-backtick code spans', () => {
    const line = 'Quote ``{#custom-id}`` and `` `## H {#id}` `` in prose.';
    expect(stripExplicitAnchorMarkers(line)).toBe(line);
  });

  it('strips prose markers next to a code span and keeps the span', () => {
    expect(stripExplicitAnchorMarkers('Use `{#id}` here {#x}, then `a` {#y}')).toBe(
      'Use `{#id}` here, then `a`',
    );
  });

  it('closes a code span only on a backtick run of the same length', () => {
    // "`" is not closed by "``", so neither run opens a span and both markers are prose.
    expect(stripExplicitAnchorMarkers('` {#a} `` {#b}')).toBe('` ``');
    // A "``" span runs past the single backtick inside it.
    const span = 'x `` a ` {#keep} `` y';
    expect(stripExplicitAnchorMarkers(span)).toBe(span);
  });

  it('does not let an unclosed backtick hide a later marker', () => {
    expect(stripExplicitAnchorMarkers('Use ` here {#x} now')).toBe('Use ` here now');
  });

  it('keeps brace ids on the lines of a fenced block that are not headings', () => {
    for (const fence of ['```', '~~~']) {
      const example = ['::: {#note}', 'Text [span]{#s} and {#keep}.', ':::'];
      expect(strip(['## Real {#real-id}', '', fence + 'markdown', ...example, fence, ''])).toBe(
        ['## Real', '', fence + 'markdown', ...example, fence, ''].join('\n'),
      );
    }
  });

  it('strips every marker on a heading line, inside a fence or a code span too', () => {
    // Slug code strips the whole title and skips no fence, so the heading text has to match it.
    expect(stripExplicitAnchorMarkers('## The `{#id}` syntax {#syntax}\n')).toBe(
      '## The `` syntax\n',
    );
    expect(strip(['```markdown', '## Title {#keep-me}', 'Text {#keep}', '```'])).toBe(
      ['```markdown', '## Title', 'Text {#keep}', '```'].join('\n'),
    );
    // Only a line that parses as an ATX heading at column 0 counts.
    for (const line of ['> ## The `{#id}` syntax', '  ## The `{#id}` syntax']) {
      expect(stripExplicitAnchorMarkers(line)).toBe(line);
    }
  });

  it('keeps markers on a fenced heading line that starts one to three spaces in', () => {
    // mdcp reads a heading only at column 0, so the indented line is fenced text.
    for (const indent of [' ', '   ']) {
      const md = ['```markdown', indent + '## Title {#keep}', '```', ''];
      expect(strip(md)).toBe(md.join('\n'));
    }
    // Outside a fence the same line is prose, and its marker goes.
    expect(stripExplicitAnchorMarkers(' ## Title {#drop}')).toBe(' ## Title');
  });

  it('keeps a four-backtick fence open past a three-backtick line', () => {
    const md = ['````markdown', '```', 'Inner {#keep}', '```', '````', '', 'After {#drop}'];
    expect(strip(md)).toBe([...md.slice(0, -1), 'After'].join('\n'));
  });

  it('does not close a backtick fence with tildes', () => {
    const md = ['```', '~~~', 'Inner {#keep}', '```', 'After {#drop}'];
    expect(strip(md)).toBe([...md.slice(0, -1), 'After'].join('\n'));
  });

  it('does not close a fence on a line indented four or more columns', () => {
    // A Markdown example that nests a fenced block in a list item. The inner fence lines sit four
    // columns in, so they are content of the outer fence and cannot close it.
    const md = [
      '```markdown',
      '1.  Install:',
      '',
      '    ```bash',
      '    npm i -g mdcp {#keep}',
      '    ```',
      '```',
      '',
      'Text {#t}.',
    ];
    expect(strip(md)).toBe([...md.slice(0, -1), 'Text.'].join('\n'));
  });

  it('does not open a fence on a line indented four or more columns', () => {
    const md = ['To open a fence, type:', '', '    ```bash', '', 'Text {#t}.'];
    expect(strip(md)).toBe([...md.slice(0, -1), 'Text.'].join('\n'));
    const item = ['- Type:', '', '      ```', '', 'Text {#t}.'];
    expect(strip(item)).toBe([...item.slice(0, -1), 'Text.'].join('\n'));
  });

  it('keeps markers in a fence that opens on a list marker line, and ends it with the item', () => {
    const md = ['- ```bash', '  npm i {#keep}', '  ```', '  More text {#t}.', '', 'Text {#n}'];
    expect(strip(md)).toBe(
      ['- ```bash', '  npm i {#keep}', '  ```', '  More text.', '', 'Text'].join('\n'),
    );
    // Without a closing fence, the first line left of the item's content ends the fence.
    expect(strip(['1. ```js', '   x {#keep}', 'Text {#t}.'])).toBe(
      ['1. ```js', '   x {#keep}', 'Text.'].join('\n'),
    );
  });

  it('keeps markers in a closed fence inside a list item', () => {
    const md = ['1. Step:', '', '   ```markdown', '   ## T {#keep}', '   ```', '', 'After {#x}'];
    expect(strip(md)).toBe([...md.slice(0, -1), 'After'].join('\n'));
  });

  it('keeps a marker in a fence info string', () => {
    for (const opener of ['```{#lst}', '``` {#lst}', '~~~ {#lst}']) {
      const md = [opener, 'code', opener.slice(0, 3), ''].join('\n');
      expect(stripExplicitAnchorMarkers(md)).toBe(md);
    }
  });

  it('ends an unclosed fence with its list item, as a renderer does', () => {
    const unclosed = [
      '- Install:',
      '',
      '  ```bash',
      '  npm i {#keep}',
      '',
      '## Next {#next}',
      'Text {#t}.',
    ];
    expect(strip(unclosed)).toBe(
      ['- Install:', '', '  ```bash', '  npm i {#keep}', '', '## Next', 'Text.'].join('\n'),
    );
  });

  it('strips heading markers where the fence scanner and a renderer disagree', () => {
    // A fence line inside an HTML comment opens a fence for the scanner but not for a renderer.
    // The heading still loses its marker, and the prose keeps its own.
    expect(strip(['<!--', '```', '-->', '', '## Next {#next}', 'Text {#t}.'])).toBe(
      ['<!--', '```', '-->', '', '## Next', 'Text {#t}.'].join('\n'),
    );
  });

  it('strips markers where the documented limits apply', () => {
    // The fence scanner reads no blockquotes, and indented code blocks are not fences.
    expect(stripExplicitAnchorMarkers('> ```\n> Text {#x}\n> ```')).toBe('> ```\n> Text\n> ```');
    expect(stripExplicitAnchorMarkers('Para\n\n    Text {#x}')).toBe('Para\n\n    Text');
    // Spans are paired per line with no escapes, so a wrapped span or an escaped backtick
    // shifts the pairing. A shift can drop a quoted marker or keep a prose one.
    expect(stripExplicitAnchorMarkers('Write `## H\n{#x}` here.')).toBe('Write `## H\n` here.');
    expect(stripExplicitAnchorMarkers('Type \\` then `{#x}`.')).toBe('Type \\` then ``.');
    const kept = 'Type \\` then {#x} and `code`.';
    expect(stripExplicitAnchorMarkers(kept)).toBe(kept);
  });

  it('keeps the blank line before a marker that opens a line', () => {
    expect(stripExplicitAnchorMarkers('para\n\n{#x} more')).toBe('para\n\nmore');
  });

  it('drops the whitespace after a marker that opens a line and keeps the indent', () => {
    // Four spaces left at the start of the line would turn it into an indented code block.
    expect(stripExplicitAnchorMarkers('para\n\n{#x}    more')).toBe('para\n\nmore');
    expect(stripExplicitAnchorMarkers('- item\n\n  {#x}  more')).toBe('- item\n\n  more');
    // A brace group that is not a marker stays where it is.
    expect(stripExplicitAnchorMarkers('{#not an id}  more')).toBe('{#not an id}  more');
  });

  it('drops a line that only held a marker', () => {
    expect(stripExplicitAnchorMarkers('line one\n{#x}\nline two')).toBe('line one\nline two');
    expect(stripExplicitAnchorMarkers('| a |\n| --- |\n| b |\n  {#x}  \n| c |')).toBe(
      '| a |\n| --- |\n| b |\n| c |',
    );
    expect(stripExplicitAnchorMarkers('a\r\n{#x}\r\nb\r\n')).toBe('a\r\nb\r\n');
    // A line that was already blank stays, and a blank run around a dropped line stays single.
    expect(stripExplicitAnchorMarkers('a {#x}\n\nb')).toBe('a\n\nb');
    expect(stripExplicitAnchorMarkers('a\n\n{#x}\n\nb\n')).toBe('a\n\nb\n');
    expect(stripExplicitAnchorMarkers('a\r\n\r\n{#x}\r\n\r\nb')).toBe('a\r\n\r\nb');
    // At the start or end of the input, the blank line next to the dropped line goes or stays.
    expect(stripExplicitAnchorMarkers('{#x}\n\nfoo')).toBe('foo');
    expect(stripExplicitAnchorMarkers('a\n\n{#x}')).toBe('a\n');
  });

  it('keeps CRLF line endings', () => {
    expect(stripExplicitAnchorMarkers('## H {#id}\r\n```\r\n{#keep}\r\n```\r\n')).toBe(
      '## H\r\n```\r\n{#keep}\r\n```\r\n',
    );
  });
});
