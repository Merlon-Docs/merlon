import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { githubSlugify } from '../src/refs/slugs.js';

const repoRoot = join(import.meta.dirname, '../../..');

function readRepoDoc(...segments: string[]): string {
  return readFileSync(join(repoRoot, ...segments), 'utf8');
}

const PREPROCESSOR_HEADING = 'Preprocessor / templating (out of scope)';
const PREPROCESSOR_SLUG = 'preprocessor--templating-out-of-scope';
const PREPROCESSOR_SHARD = 'docs/features/design-constraints/preprocessor-templating.md';
const GLOSSARY_MANIFEST = '../glossary/index.md';

/** Guides that own the full glossary TOC (not lean npm package READMEs). */
const GLOSSARY_TOC_GUIDE_INDEXES = ['docs/features/index.md', 'docs/developer/index.md'] as const;

/** Compiled outputs expected to stitch the shared glossary. */
const GLOSSARY_COMPILED_GUIDES = ['DEVELOPERS.md'] as const;

describe('design scope documentation (#26)', () => {
  const designConstraintsIndex = readRepoDoc('docs/features/design-constraints/index.md');
  const preprocessorShard = readRepoDoc(PREPROCESSOR_SHARD);
  const gfmScopeShard = readRepoDoc('docs/features/design-constraints/gfm-scope.md');
  const featureCatalog = readRepoDoc('docs/features/feature-catalog.md');
  const packagesAndTests = readRepoDoc('docs/developer/packages-and-tests.md');
  const compileHooks = readRepoDoc('docs/client-core/compile-hooks/index.md');
  const glossaryIndex = readRepoDoc('docs/glossary/index.md');

  it('uses the GitHub slug for the preprocessor heading', () => {
    expect(githubSlugify(PREPROCESSOR_HEADING)).toBe(PREPROCESSOR_SLUG);
  });

  it('shards design constraints with a manifest and section files', () => {
    expect(designConstraintsIndex).toContain('# Design constraints');
    expect(designConstraintsIndex).toContain('./preprocessor-templating.md');
    expect(designConstraintsIndex).toContain('./gfm-scope.md');
    expect(designConstraintsIndex).toContain('./locale-and-language.md');
    expect(designConstraintsIndex).toContain('./md-tree-integration.md');
  });

  it('documents GFM vs locale-pack boundary for opinionated English helpers', () => {
    const localeShard = readRepoDoc('docs/features/design-constraints/locale-and-language.md');
    const localeGlossary = readRepoDoc('docs/glossary/locale-pack.md');
    const crossLinkGlossary = readRepoDoc('docs/glossary/cross-link.md');
    expect(localeShard).toContain('# Locale and language boundary');
    expect(localeShard).toContain('locale pack');
    expect(localeShard).toContain('Vale');
    expect(localeShard).toContain('BasedOnStyles');
    expect(localeShard).toContain('@bwilliamson/mdcp-presets');
    expect(localeShard).toContain('vale/MDCP');
    expect(localeShard).toContain('Pandoc IDs');
    expect(localeShard).toContain('GFM cross-refs');
    expect(localeShard).not.toContain('lintXrefs');
    expect(localeShard).not.toContain('MDCP-Xref');
    expect(localeShard).toContain('en-US');
    expect(localeShard).toContain('Hunspell');
    expect(localeGlossary).toContain('# Locale pack');
    expect(localeGlossary).toContain('compile-time');
    expect(localeGlossary).not.toContain('transitional');
    expect(glossaryIndex).toContain('./locale-pack.md');
    expect(glossaryIndex).not.toContain('./xref.md');
    expect(crossLinkGlossary).toContain('cross-ref');
  });

  it('keeps markdown helpers language-agnostic and Vale prose out of core vocabulary', () => {
    const docsValeConfig = readRepoDoc('docs/.vale.ini');
    const sampleValeConfig = readRepoDoc('examples/sample-guides/.vale.ini');
    const localeShard = readRepoDoc('docs/features/design-constraints/locale-and-language.md');
    const pandocMeta = readRepoDoc('docs/vale-local/MDCP-PandocId/meta.json');
    expect(packagesAndTests).toContain('language-agnostic');
    expect(packagesAndTests).toContain('Peer Vale');
    expect(packagesAndTests).not.toContain(
      'Shared heading and Pandoc-style explicit-id marker helpers live under `src/markdown/`',
    );
    expect(localeShard).toContain('does not model chapters/sections');
    expect(featureCatalog).toContain('Peer Vale prose');
    expect(featureCatalog).toContain('Pandoc IDs');
    expect(featureCatalog).toContain('not replace');
    expect(pandocMeta).toContain('MDCP-PandocId');
    expect(pandocMeta).toContain('Pandoc IDs');
    expect(docsValeConfig).toContain('MDCP-PandocId');
    expect(docsValeConfig).not.toContain('MDCP-Xref');
    expect(docsValeConfig).not.toContain('BlockIgnores');
    expect(sampleValeConfig).toContain('MDCP-PandocId');
    expect(sampleValeConfig).not.toContain('BlockIgnores');
  });

  it('documents preprocessor and templating only in the preprocessor shard', () => {
    expect(preprocessorShard).toMatch(/# Preprocessor \/ templating \(out of scope\)/);
    expect(preprocessorShard).toContain(
      'preprocess (optional) → mdcp compile / check → postprocess (optional)',
    );
    expect(preprocessorShard).toContain('{{variable}}');
    expect(preprocessorShard).toContain('Handlebars');
    expect(preprocessorShard).toContain('inlineInserts');
    expect(preprocessorShard).toContain('Not compile hooks');
    expect(featureCatalog).not.toContain('{% if %}');
    expect(compileHooks).not.toContain('{{variables}}');
  });

  it('links scope topics from catalog and hooks without repeating the spec', () => {
    expect(featureCatalog).toContain(
      `./design-constraints/preprocessor-templating.md#${PREPROCESSOR_SLUG}`,
    );
    expect(featureCatalog).toContain('[authored GFM](../glossary/authored-gfm.md)');
    expect(compileHooks).toContain('[authored GFM](../../glossary/authored-gfm.md)');
    expect(compileHooks).toContain(
      `../../features/design-constraints/preprocessor-templating.md#${PREPROCESSOR_SLUG}`,
    );
  });

  it('defines GFM and authored GFM in the shared glossary', () => {
    const gfm = readRepoDoc('docs/glossary/gfm.md');
    const authoredGfm = readRepoDoc('docs/glossary/authored-gfm.md');
    expect(gfm).toContain('# GFM');
    expect(authoredGfm).toContain('# Authored GFM');
    expect(gfm).toContain('GitHub Flavored Markdown');
    expect(gfm).toContain('ATX subset');
    expect(gfmScopeShard).toContain('[GFM](../../glossary/gfm.md)');
    expect(gfmScopeShard).toContain('## Headings');
    expect(gfmScopeShard).toContain('Setext');
    expect(gfmScopeShard).toContain('Not yet');
    expect(gfmScopeShard).toContain('parseHeading');
    expect(gfmScopeShard).toContain('https://github.github.com/gfm/');
  });

  it('lists glossary in maintainer guide manifests', () => {
    for (const indexPath of GLOSSARY_TOC_GUIDE_INDEXES) {
      expect(readRepoDoc(indexPath)).toContain(GLOSSARY_MANIFEST);
    }
    expect(glossaryIndex).toContain('../client-cli/config-essentials.md#shared-glossary');
    // Lean npm package guides may link individual terms transitively — they must
    // not be required to dump the full glossary TOC into consumer READMEs.
    expect(readRepoDoc('docs/client-cli/index.md')).not.toContain(GLOSSARY_MANIFEST);
    expect(readRepoDoc('docs/client-core/index.md')).not.toContain(GLOSSARY_MANIFEST);
  });

  it('stitches glossary into maintainer compiled guide output', () => {
    for (const outputPath of GLOSSARY_COMPILED_GUIDES) {
      const compiled = readRepoDoc(outputPath);
      expect(compiled).toContain('## GFM');
      expect(compiled).toContain('## Authored GFM');
      expect(compiled).toContain('## cross-link');
      expect(compiled).not.toContain('## xref');
    }
  });
});
