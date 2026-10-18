import { registerCompileHook } from '../hooks.js';
import { stripExplicitAnchorMarkers } from '../anchors.js';
import { codeEvidenceHook } from './code-evidence.js';
import { inlineInsertsHook } from './inline-inserts.js';

registerCompileHook('stripAnchors', (ctx) => stripExplicitAnchorMarkers(ctx.body));
registerCompileHook('codeEvidence', codeEvidenceHook);
registerCompileHook('inlineInserts', inlineInsertsHook);
