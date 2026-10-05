---
'@bwilliamson/mdcp-core': patch
---

Write each `l` of a line fragment as `L`, and trim slashes and backticks in linear time

`codeEvidence` keeps a line fragment that a link already has, such as `#L6-L8`. It wrote only the first `l` of that fragment in upper case, so `#l6-l8` compiled to `#L6-l8` instead of the `#L6-L8` form the hook writes for every other range. It now writes each `l` as `L`.

`shardLintPaths` trimmed the slashes at the end of a `shardsGlobs` entry that starts with `../` with `/\/+$/`, and `codeEvidence` trimmed the backticks around a link label with ``/^`+|`+$/g``. When a run of slashes or backticks is followed by other text, each regex rescans the run from each of its characters. An entry with 80,000 slashes before a letter took 8.2 s, and so did a label with 80,000 backticks between two letters. Each trim is now a loop, and the same entry takes under 1 ms and the same label 6 ms in the hook. New cases in the ReDoS budget suite cover both.
