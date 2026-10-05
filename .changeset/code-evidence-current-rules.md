---
'@bwilliamson/mdcp-core': patch
---

The core README's codeEvidence section states the rules the hook applies. Symbol lookup links the first line where the symbol appears as a whole word, which can be an import or a comment, and a line range cites the declaration. The hook skips a path to an extensionless file when the path has a `.` in it, such as `../../Makefile`. `compile.scopeRoot` and `compile.outputFile` resolve from the docs root and from `outputDir`, and the example config writes its output to the repository root as the compiled example shows. The example uses neutral file names.
