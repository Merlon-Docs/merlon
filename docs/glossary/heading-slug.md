# heading slug

GitHub-style fragment id for a heading in **compiled** Markdown (the part after `#` in `[label](#slug)`). Parent concept: [refs](./refs.md).

MDCP computes slugs from final heading text after guides are stitched and demoted, with the same rules GitHub uses for README anchors (via `github-slugger`). Duplicate titles in one document get `-1`, `-2` suffixes. Authors should not invent fragments from shard-only titles; [cross-links](./cross-link.md) must match the compiled slug, and `mdcp check` fails when they do not.
