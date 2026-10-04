import { demoteHeadings, stripAboutThisGuideHeading } from './headings.js';
import { extractFirstHeading } from './compile-title.js';
import { githubSlugify } from '../refs/slugs.js';

const FIND_FILE_RE = /^FIND-\d+\.md$/i;

export function sectionBodyForSlug(
  filename: string,
  content: string,
  preambleSection = 'about-this-guide.md',
): string {
  if (filename === preambleSection) {
    const body = stripAboutThisGuideHeading(content);
    return body.trim() ? demoteHeadings(body, 1) : body;
  }
  return demoteHeadings(content, 1);
}

/** A section's declared id: the FIND-* file name, else a `{#id}` on its first heading. */
export function declaredSectionSlug(filename: string, processed: string): string | null {
  if (FIND_FILE_RE.test(filename)) {
    return githubSlugify(filename.replace(/\.md$/i, ''));
  }
  return extractFirstHeading(processed).anchor;
}

export function slugForDemotedSection(filename: string, processed: string): string | null {
  if (FIND_FILE_RE.test(filename)) return declaredSectionSlug(filename, processed);
  const heading = extractFirstHeading(processed);
  if (!heading.text) return null;
  return heading.anchor ?? githubSlugify(heading.text);
}
