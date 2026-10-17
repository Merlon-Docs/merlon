import enUSCopy from '../locales/en-US.json' with { type: 'json' };
import { createLocalePack } from '../create-locale-pack.js';

/** Default US-English locale pack for opinionated helpers. */
export const enUS = createLocalePack({
  id: 'en-US',
  brokenLinks: enUSCopy.brokenLinks,
  inserts: enUSCopy.inserts,
  lineRangeWords: enUSCopy.lineRangeWords,
  aboutThisGuideTitle: enUSCopy.aboutThisGuideTitle,
  headingKeyPattern: enUSCopy.headingKeyPattern,
  headingKeyTemplate: enUSCopy.headingKeyTemplate,
});
