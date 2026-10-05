---
'@bwilliamson/mdcp-core': patch
---

The publish-relative pass now rebases a shard's own link to an output of the run, such as `../../README.md` or `../../DEVELOPERS.md#setup`, like a link to any other file. It counts each compiled guide as existing before compile writes it, and the monolith too when a guide is stitched into it. A first compile then rebases the link as later ones do. When every guide sets `compile.outputFile`, the run never writes the configured monolith. The pass then treats a path to the monolith as missing, even when an earlier run left the file on disk. Such a link used to keep its shard-relative path on a fresh tree and be rebased once the file was there.

The pass used to skip a target whenever an entry in the guide link index named it as its output file. An entry's output file is its owner's publish output, or the monolith for a monolith guide. In a config without a monolith, it is the owner's compiled guide. A shard's link to one of them kept its shard-relative path and broke in a compiled guide at another depth than the shard. The skip was meant for links the cross-guide pass writes. The pass now tells those links apart from the shard's own and leaves only them alone.

The publish-relative section of the core README says the pass rebases a link to an output, and its path lookup order says when the monolith counts as missing. The API config section and the features overview give a path that leads to no file as their example of a link the pass leaves as written.
