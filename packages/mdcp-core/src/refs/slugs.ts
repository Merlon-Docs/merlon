import GithubSlugger, { slug as githubSlug } from 'github-slugger';
import { getLocalePack, type LocalePack } from '../locale/index.js';
import {
  createCodeFenceScanner,
  headingTitlePlain,
  parseHeading,
  stripPandocAnchors,
} from '../markdown/index.js';

/**
 * Strip mdcp heading adornments before slugging.
 * github-slugger expects plain visible text (html-pipeline `node.text`), not raw Markdown.
 */
export function headingTextToPlain(text: string): string {
  return headingTitlePlain(text);
}

/** GitHub heading slug via github-slugger (html-pipeline TableOfContentsFilter algorithm). */
export function githubSlugify(text: string): string {
  return githubSlug(headingTextToPlain(text));
}

/** A heading line as the compiled document renders it. */
export interface RenderedHeading {
  level: number;
  /** Title without `**`, trimmed, and without `{#id}` markers unless the reader keeps them. Never empty. */
  title: string;
}

export interface HeadingReaderOptions {
  /** Read `{#id}` markers as title text, for a document that compile left them in. */
  keepAnchorMarkers?: boolean;
}

/**
 * Read a document's headings the way it renders. Call the returned function with each line in
 * order. It returns the heading on that line, or null for a line that is not a heading, a heading
 * whose title is empty once its markers are gone, or any line inside a fenced code block (see
 * `createCodeFenceScanner`). With `keepAnchorMarkers`, a marker counts as title text. The reader carries fence state from one line to the next, so
 * sections read in stitch order share one reader.
 *
 * `buildSlugRegistry` and compile's section slugs both read headings through this function, so a
 * section link and the registry number the same headings.
 */
export function createHeadingReader(
  options: HeadingReaderOptions = {},
): (line: string) => RenderedHeading | null {
  const inFence = createCodeFenceScanner();
  const keepMarkers = options.keepAnchorMarkers === true;
  return (line) => {
    if (inFence(line)) return null;
    const parsed = parseHeading(line);
    if (!parsed) return null;
    const visible = keepMarkers ? parsed.title : stripPandocAnchors(parsed.title);
    const title = visible.replace(/\*\*/g, '').trim();
    return title ? { level: parsed.level, title } : null;
  };
}

export interface HeadingEntry {
  key: string | null;
  slug: string;
  title: string;
  guide: string;
  sourceFile: string | null;
  level: number;
  line: number;
}

/** One compiled output's headings, slugged on their own. */
export interface RefsOutput {
  /** The output's path relative to the docs root, with `/` separators. */
  file: string;
  /** The guide whose compiled guide this is. Absent for the monolith. */
  guideName?: string;
  /** The output's headings. Each `line` is a line of the file as compile writes it. */
  headings: HeadingEntry[];
  slugs: Record<string, string>;
}

export interface RefsRegistry {
  generatedFrom: string;
  /**
   * The headings of the text the registry was generated from. For a compile run that is the
   * monolith when the config sets top-level `outputFile`, and otherwise every compiled guide
   * joined in `compileOrder`, without banners.
   */
  headings: HeadingEntry[];
  slugs: Record<string, string>;
  /**
   * Every file the compile run writes, in the order compile writes them: each compiled guide,
   * publish outputs included, then the monolith. Absent from a registry generated from one text.
   */
  outputs?: RefsOutput[];
}

function semanticKey(title: string, guide: string, locale: LocalePack): string | null {
  const parts = locale.headingKeyFromTitle(title);
  if (parts) return locale.formatHeadingKey(parts);
  // Language-agnostic fallback: GitHub slug from heading text (Unicode-safe).
  const safe = githubSlugify(title).slice(0, 48);
  return safe ? `${guide}.${safe}` : null;
}

export function buildSlugRegistry(
  compiledText: string,
  sourceMap?: Map<string, string>,
  locale: LocalePack = getLocalePack(),
): RefsRegistry {
  const slugger = new GithubSlugger();
  const headings: HeadingEntry[] = [];
  const slugs: Record<string, string> = {};

  let currentGuide = '';

  const readHeading = createHeadingReader();
  const lines = compiledText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const heading = readHeading(lines[i]);
    if (!heading) continue;

    const { level, title: rawTitle } = heading;

    if (level === 1) {
      currentGuide = githubSlugify(rawTitle).slice(0, 32) || 'guide';
    }

    const slug = slugger.slug(headingTextToPlain(rawTitle));

    const key = semanticKey(rawTitle, currentGuide, locale);
    const sourceFile = sourceMap?.get(slug) ?? null;

    headings.push({
      key,
      slug,
      title: rawTitle,
      guide: currentGuide,
      sourceFile,
      level,
      line: i + 1,
    });

    if (key) slugs[slug] = key;
  }

  return { generatedFrom: 'compiled', headings, slugs };
}
