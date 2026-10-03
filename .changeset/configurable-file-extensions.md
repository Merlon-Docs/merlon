---
'@bwilliamson/mdcp-core': minor
'@bwilliamson/mdcp-cli': minor
---

Make the file extension lists broad, split and configurable

The set of extensions that mark a link target or path claim as naming a file was
a fixed regex covering about 30 mostly web-stack extensions. It is now two
default lists. **Code** extensions span JVM, .NET, systems, scripting, template,
schema and infrastructure formats: a symbol can cite a line in one of these.
**Data** extensions cover configuration, tabular and serialized formats, which
are validated for existence exactly like code but never cited by line, because
an identifier found in inert content is an occurrence rather than a declaration.

`lint.codeExtensions` and `lint.dataExtensions` extend the defaults for a project
on a stack they do not list. Moving an extension into the code list is also how a
repository asks for lines to be cited in a format that ships as data, its
workflow YAML for instance. Entries are accepted with or without a leading dot,
and matching is a set lookup rather than a generated pattern, so a configured
value cannot change how matching behaves.

Both lists together govern link validation and path resolution in prose, which
additionally always accepts `.md` and `.mdx`. The `codeEvidence` compile hook
rewrites links for either list and cites lines only from the code one.

Broadening the defaults exposed a compile bug: `codeEvidence` rebased a file
link relative to the output file only when it also added an `#L` line fragment,
so a link to a data file stayed shard-relative and broke in output published
from another directory. It now rebases whenever the target resolves.
