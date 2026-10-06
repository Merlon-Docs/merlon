---
'@bwilliamson/mdcp-core': patch
---

Compile now rebases a link target made only of `../` segments. A bare `../` used to stay as written, so in the compiled guide it pointed away from the directory the shard meant. A target such as `../../` that resolves to the directory containing the guide's output compiled to an empty href, and `../../#top` lost its path and became the same-document link `#top`. These targets now compile to the directory path, or to `./` when that directory contains the output. Any other target that resolves to the output's own directory, such as `../../pkg/` in a guide that compiles to `pkg/README.md`, also compiles to `./` now.
