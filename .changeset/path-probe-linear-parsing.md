---
'@bwilliamson/mdcp-core': patch
---

Parse path claims without backtracking regexes

The prose path probe trimmed `./`, trailing slashes and `#fragment` with
regexes anchored at the end of the string. Those backtrack on a span holding a
long run of slashes followed by a non-slash — measured 156 ms at 20,000 slashes,
5.2 s at 120,000 — and a backtick span is documentation text, so the input is
not ours to trust. CodeQL flagged the pattern as `js/polynomial-redos`.

Trimming is now index arithmetic, which is linear whatever the input, with the
timing covered in the existing ReDoS budget suite.
