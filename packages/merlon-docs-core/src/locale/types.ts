/** Natural-language pack for compiled prose and semantic refs (not GFM structure). */
export interface LocalePack {
  /** BCP 47 language tag (for example `en-US`). */
  readonly id: string;

  readonly brokenLinks: LocaleBrokenLinkCopy;
  readonly inserts: LocaleInsertCopy;

  /**
   * Authored word forms that introduce a line number or range in link labels
   * (en-US: `lines`, `line`). Longest-first. Not GitHub `#L…` protocol output —
   * see codeEvidence line-range docs.
   */
  readonly lineRangeWords: readonly string[];

  /**
   * Locale display title for the about-this-guide preamble H1/H2
   * (en-US: `About this guide`). Used for strip matching (case-insensitive)
   * and shard preamble promotion defaults. Not the `about-this-guide.md` path id.
   */
  readonly aboutThisGuideTitle: string;

  /**
   * Locale-specific semantic key parts from a heading title when the title
   * matches `headingKeyPattern` (en-US example: `ADM Chapter 1` →
   * `{ prefix: 'ADM', number: '1' }`), or null when it does not match.
   * MDCP does not model chapters — the pattern string is locale data only.
   */
  headingKeyFromTitle(title: string): { prefix: string; number: string } | null;

  /** Format a semantic heading key (en-US default template: `{prefix}.ch{number}`). */
  formatHeadingKey(parts: { prefix: string; number: string }): string;
}

/** Broken-link marker wording in compiled output. */
export interface LocaleBrokenLinkCopy {
  readonly markerLabel: string;
  readonly reasonDeadAnchor: string;
  readonly reasonMissingFile: string;
  readonly reasonMissingPublishPath: string;
  formatMarker(label: string, originalTarget: string, brokenTarget: string, reason: string): string;
  /** True when a line already contains a broken-link marker. */
  lineHasMarker(line: string): boolean;
  /**
   * Each broken-link marker in a line, as its own text, in line order. Link lint uses it to match a
   * marker in two files whose lines differ elsewhere. Without it, lint matches whole lines.
   */
  findMarkers?(line: string): string[];
}

/** Broken-link locale messages before formatter helpers are attached. */
export interface LocaleBrokenLinkMessages {
  readonly markerLabel: string;
  readonly markerTemplate: string;
  readonly reasonDeadAnchor: string;
  readonly reasonMissingFile: string;
  readonly reasonMissingPublishPath: string;
}

/** Inline-insert caption wording. */
export interface LocaleInsertCopy {
  /** Display title for an insert kind id (`diagram` → `Diagram`). */
  kindTitle(kind: string): string;
  /** Fallback link text when a back-link has an empty label. */
  readonly seeInsertFallback: string;
  /** Title-case a hyphenated basename for captions. */
  humanizeBasename(basenameWithoutExt: string): string;
}

/** Inline-insert locale messages before formatter helpers are attached. */
export interface LocaleInsertMessages {
  /** Fallback link text when a back-link has an empty label. */
  readonly seeInsertFallback: string;
}
