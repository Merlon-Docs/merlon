import { stripPandocAnchors } from './anchors.js';

/**
 * Strip anchors and light inline adornments for slugger input (parity with headingTextToPlain).
 * With `keepAnchorMarkers`, `{#id}` markers stay as text, as a renderer shows them when compile
 * leaves them in.
 */
export function headingTitlePlain(
  text: string,
  options: { keepAnchorMarkers?: boolean } = {},
): string {
  const visible = options.keepAnchorMarkers ? text.trim() : stripPandocAnchors(text.trim());
  return visible.replace(/[*_`]/g, '').trim();
}
