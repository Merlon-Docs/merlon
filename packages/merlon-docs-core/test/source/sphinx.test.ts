import { describe, it, expect } from 'vitest';
import { deflateSync } from 'node:zlib';
import { checkSourceDocs, formatSourceIssue } from '../../src/check/sources.js';
import { rstReader, rstFormatWithSphinx } from '../../src/source/rst/reader.js';
import { parseSphinxInventory, type SphinxRefOptions } from '../../src/source/rst/sphinx.js';
import { getFormat } from '../../src/source/registry.js';

const ROOT = '/kernel/Documentation';

function issues(files: Record<string, string>, sphinx: SphinxRefOptions = {}): string[] {
  const docs = Object.entries(files).map(([rel, text]) =>
    rstReader.read(text, { path: `${ROOT}/${rel}` }),
  );
  const formatOf = (id: string) => (id === 'rst' ? rstFormatWithSphinx(sphinx) : getFormat(id));
  return checkSourceDocs({ docs, docsRoot: ROOT, roots: [], formatOf }).map(formatSourceIssue);
}

const CODING_STYLE = [
  'Linux kernel coding style',
  '=========================',
  '',
  '13) Printing kernel messages',
  '----------------------------',
  '',
  'Text.',
].join('\n');

const USES_SECTION = 'See :ref:`process/coding-style:13) Printing kernel messages`.\n';

describe('Sphinx reference resolver', () => {
  it('resolves autosectionlabel targets with the document prefix', () => {
    const files = { 'process/coding-style.rst': CODING_STYLE, 'other.rst': USES_SECTION };
    expect(issues(files, { autosectionlabel: { prefixDocument: true } })).toEqual([]);
    expect(issues(files)).toEqual([
      'undefined-ref: other.rst:1: label is not defined "process/coding-style:13) printing kernel messages"',
    ]);
  });

  it('resolves bare section titles without the prefix, down to maxDepth', () => {
    const files = {
      'a.rst': CODING_STYLE,
      'b.rst': 'See :ref:`Linux kernel coding style` and :ref:`13) printing kernel messages`.\n',
    };
    expect(issues(files, { autosectionlabel: {} })).toEqual([]);
    expect(issues(files, { autosectionlabel: { maxDepth: 1 } })).toEqual([
      'undefined-ref: b.rst:1: label is not defined "13) printing kernel messages"',
    ]);
  });

  it('resolves a target defined only by a :name: option', () => {
    const files = {
      'a.rst': '.. code-block:: c\n   :name: example-listing\n\n   int x;\n',
      'b.rst': 'See :ref:`the listing <example-listing>`.\n',
    };
    expect(issues(files)).toEqual([]);
  });

  it('accepts built-in and ignored generated labels', () => {
    const files = { 'a.rst': 'See :ref:`genindex`, :ref:`abi_sysfs_class` and :ref:`missing`.\n' };
    expect(issues(files, { ignoreLabels: ['^abi_.*'] })).toEqual([
      'undefined-ref: a.rst:1: label is not defined "missing"',
    ]);
  });

  it('accepts labels from a built objects.inv', () => {
    const body = [
      'built-label std:label -1 x.html#built-label Built label',
      'Two Words std:label -1 x.html#two-words Two words',
      'process/index std:doc -1 process/index.html Process',
      'kmalloc c:function 1 core-api/mm-api.html#c.kmalloc -',
    ].join('\n');
    const inv = Buffer.concat([
      Buffer.from(
        '# Sphinx inventory version 2\n# Project: demo\n# Version: 1\n# The remainder of this file is compressed using zlib.\n',
      ),
      deflateSync(Buffer.from(body)),
    ]);
    const parsed = parseSphinxInventory(inv);
    expect([...parsed.labels]).toEqual(['built-label', 'two words']);
    expect([...parsed.docs]).toEqual(['process/index']);
    const files = { 'a.rst': 'See :ref:`built-label` and :ref:`Two  Words`.\n' };
    expect(issues(files, { inventoryLabels: parsed.labels })).toEqual([]);
  });

  it('rejects an inventory that is not version 2', () => {
    expect(() =>
      parseSphinxInventory(Buffer.from('# Sphinx inventory version 1\na\nb\nc\n')),
    ).toThrow(/unsupported header/);
  });
});
