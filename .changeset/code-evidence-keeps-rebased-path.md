---
'@bwilliamson/mdcp-core': patch
---

The publish-relative pass no longer rewrites a link that `codeEvidence` already rebased.

`codeEvidence` writes a source link's path relative to the link base. The publish-relative pass then read that path as relative to the shard and looked it up from the shard's directory first. When that path led to another file from there, the link pointed at it, with a line fragment taken from the file the hook had read. A shard at `docs/a/sub/deep.md` that links `../../../src/foo.ts` compiled to `../src/foo.ts#L3` in `docs/_build/a.md` once `docs/src/foo.ts` existed. The link now keeps the path the hook wrote, `../../src/foo.ts#L3`.

Assembly marks the links the hook rebased once every hook has run. The hook itself returns its links without a mark, to a direct `applyCompileHooks` call and to a hook that runs after it. Assembly finds each link by the text the hook wrote and by its place among the links with that text, so a link that the shard wrote with the same text and the hook left alone doesn't get a mark. When a hook listed after `codeEvidence` changes that text, or adds or removes a link with that text above it, the publish-relative pass can still rebase the hook's path, and leave another link with that text as it is.

The compile hooks section of the core README states the rule under "Link passes" and lists a link the hook rebased among the publish-relative exclusions. The codeEvidence section now says which `../` links the publish-relative pass rebases, and the publish-relative examples from MDCP's own docs show links that pass rebases.
