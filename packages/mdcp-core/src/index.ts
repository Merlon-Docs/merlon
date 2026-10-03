export {
  MdcpConfigSchema,
  type MdcpConfig,
  type MdcpConfigInput,
  type GuideConfig,
  type GuideConfigInput,
} from './config/schema.js';
export {
  loadConfig,
  resolveOutputPath,
  resolveGuideLinkBase,
  resolveRefsPath,
  resolveDocsRoot,
  resolveGuideDir,
  getGuideConfig,
  guideScanDirs,
  shardLintPaths,
  defaultGuideOutputFile,
  effectiveGuideOutputFile,
  resolveUnderOutputDir,
} from './config/load.js';
export {
  DEFAULT_COMPILE_HOOKS,
  resolveCompileHooks,
  type DefaultCompileHook,
} from './config/resolve-compile-hooks.js';
export {
  demoteHeadings,
  demoteExceptFirstH1,
  stripAboutThisGuideHeading,
  extractGuideH1,
} from './compile/headings.js';
export { stripExplicitAnchorMarkers } from './compile/anchors.js';
export {
  extractFirstHeading,
  stripFirstHeadingLine,
  formatCompileTitle,
} from './compile/compile-title.js';
export {
  registerCompileHook,
  applyCompileHooks,
  type CompileHook,
  type CompileHookContext,
} from './compile/hooks.js';
export {
  sectionFiles,
  processSection,
  assembleGuide,
  compileGuides,
  compileGuidesFromResults,
  compileGuideResults,
  compileGuideResultsWithContext,
  writeCompiledGuides,
  writeCompiledGuidesFromResults,
  buildGuideLinkIndex,
  type CompileGuideResult,
  type CompileOptions,
  type CompileOptionsInput,
  type GuideLinkIndex,
  type GuideLinkEntry,
  type BuildGuideLinkIndexResult,
  type SectionFilesOptions,
  type CompileGuideResultsContext,
} from './compile/assemble.js';
export {
  type ShardCache,
  type ShardSnapshot,
  createShardCache,
  loadShardSnapshot,
} from './compile/shard-cache.js';
export {
  writeOutputFile,
  resolveBackupPath,
  resolveBackupOptions,
  DEFAULT_BACKUP_DIR,
  type WriteOutputBackupOptions,
  type WriteOutputContext,
  type CliBackupOverrides,
} from './compile/write-output.js';
export {
  rewriteCrossGuideFileLinks,
  rewriteIntraGuideFileLinks,
  slugForSectionFile,
  type CrossGuideLinkRewriteOptions,
} from './compile/publish-links.js';
export {
  githubSlugify,
  headingTextToPlain,
  buildSlugRegistry,
  type HeadingEntry,
  type RefsRegistry,
} from './refs/slugs.js';
export {
  writeRefsRegistry,
  readRefsRegistry,
  checkRefsRegistry,
  genRefsFromCompiled,
} from './refs/registry.js';
export {
  lintLinks,
  lintCompiledLinks,
  lintShardLinks,
  markBrokenLinks,
  formatLinkIssue,
  extractLinks,
  validateCompiledLinkTarget,
  collectShardProvenance,
  type LinkIssue,
  type LinkSeverity,
  type LinkProvenance,
  type LintLinksOptions,
} from './links/lint.js';
export { checkOrphansForGuides, type OrphanIssue, type GuideDirEntry } from './validate/orphans.js';
export {
  computeCoverage,
  resolveStandaloneGuides,
  type CoverageResult,
  type CoverageOptions,
} from './validate/coverage.js';
export {
  DEFAULT_CODE_EXTENSIONS,
  DEFAULT_DATA_EXTENSIONS,
  codeExtensionSet,
  dataExtensionSet,
  fileExtensionSet,
  hasCodeExtension,
  hasFileExtension,
  type ExtensionConfig,
} from './compile/hooks/path-resolve.js';
export {
  probeDocumentPaths,
  pathProbeInputs,
  probePathClaims,
  isPathClaim,
  pathClaimExtensions,
  hasIllustrativeMarker,
  lineOptsOut,
  formatPathProbeIssue,
  ILLUSTRATIVE_MARKER,
  type PathProbeIssue,
  type PathProbeOptions,
} from './validate/path-probe.js';
export {
  abbreviateProtocolVersion,
  expandProtocolVersion,
  parseLlmsIndexFilename,
  isLlmsIndexDraftFilename,
  protocolVersionToReleaseRef,
} from './export/protocol-version.js';
export { findPeerBinary, runPeer, type PeerTool } from './peers/resolve.js';
export { shardFromMonolith, runMdTree, type ShardGuideMapping } from './shard/orchestrator.js';
export {
  getLocalePack,
  listLocalePackIds,
  DEFAULT_LOCALE_ID,
  enUS,
  createBrokenLinksCopy,
  createInsertsCopy,
  createLocalePack,
  formatTemplate,
  type CreateLocalePackOptions,
  type LocalePack,
  type LocaleBrokenLinkCopy,
  type LocaleBrokenLinkMessages,
  type LocaleInsertCopy,
  type LocaleInsertMessages,
} from './locale/index.js';
