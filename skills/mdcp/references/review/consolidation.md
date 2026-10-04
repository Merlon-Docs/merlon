# Consolidation playbook

How to merge, split, move, and retire shards without breaking a link. Run
`mdcp check` after each operation. It reports every link the change broke.

## Move or rename

1. `git mv` the shard to its new path.
2. From the repository root, search every Markdown file for the old file name
   with the main search command from
   [Removing or renaming a concept](../../SKILL.md#removing-or-renaming-a-concept)
   in `SKILL.md`. Add to its pathspec the config files that name shards by
   path, such as `mdcp.config.json` under the docs root and a site's nav
   config. [Search for a removed concept](#search-for-a-removed-concept)
   explains its options. Search for the name rather than the path, because
   relative links use different prefixes from different directories. Update
   every link and config entry in the same commit.
3. Move the entry in both guide indexes: remove it from the old guide's
   `index.md` and add it where it belongs in the new one.
4. If the project publishes its docs as a site, add a redirect from the old URL
   using that site's mechanism.

## Search for a removed concept

**Removing or renaming a concept** in `SKILL.md` gives the search command for a
removed component, flag, command or term. It matches like this:

- Git matches the quoted `'*.md'` in every directory, standalone and
  unregistered guides included. Unquoted, the shell can expand it to the
  top-level files only.
- `-e` accepts a spelling that starts with dashes, such as `--old-flag`. `-F`
  reads each spelling literally, so the `.` in `config.json` matches only a
  dot. `-i` finds the name in a heading or at the start of a sentence.
- A spelling also matches inside longer words, so `sprawl trigger` finds
  `Sprawl triggers`. A plural that changes the ending, such as `proxies` for
  `proxy`, doesn't contain the spelling and needs its own `-e`. Write a
  directory without its trailing slash, and it matches with or without one.
- Git searches one line at a time, so a line break can split a name of two or
  more words. The distinctive word, such as `webhook` for `webhook worker`,
  finds those lines.
- `--untracked` adds new files that are not staged yet. It skips paths that
  `.gitignore` lists, such as compiled output under `_build/`.

`-w` applies to every `-e` in a command and stops each spelling from matching
inside a longer word, so it misses a plural such as `workers` for `worker`.
Keep it out of the main search. When a short single word also
appears inside unrelated words, take it out of the main command and search for
it in a second command with `-w`. Give each plural or other inflected form its
own `-e`, and put both commands in the commit message:

```bash
git grep --untracked -n -i -F -w -e '<word>' -e '<word>s' -- '*.md'
```

## Merge

1. Pick the survivor: the shard whose title and guide match the merged job.
2. Move every paragraph the survivor lacks into it, rewritten in its voice. Drop
   paragraphs that restate what the survivor already says.
3. Delete the other shard, remove it from its index, and point its incoming links
   at the survivor.
4. Check anchors. A link to `#a-heading` in the deleted shard needs that heading
   in the survivor, or a new target.

## Split (idea mitosis)

1. Name the two jobs or audiences. If you cannot, it is not a split.
2. Create a new shard for the smaller part. Leave the original path holding the
   larger part so most existing links still point at the right content.
3. Replace the moved text in the original with one sentence and a link.
4. Add the new shard to its guide index and cross-link the two.

## Link instead of restate

When a rule appears in several shards, keep it in the shard that owns the
enforcing code or decision. Replace each copy with a sentence that names the rule
and links to it. `mdcp review` lists exact copies as `duplicate-paragraph`; search
the compiled guides for the rule's key phrase to catch reworded ones.

## Reword

- A person's name → the role they hold.
- A vendor name used generically → the glossary term. Keep the vendor where the
  sentence is about that vendor's integration.
- "Used to…", `as of <date>` or `until <date>` → the current behavior, in the
  present tense. When the passage is the history behind a rule that still
  holds, move it to an ADR and link it from the doc. When it only describes
  removed behavior, delete it. An incident log or a temporary note moves to
  the tracker, and the doc does not link it.

With peer Vale and the `MDCP` style from `@bwilliamson/mdcp-presets`, the
`MDCP.DatedClaim` rule fails on `as of` or `until` before an ISO date, such as
`as of 2026-07-01`. The reword above applies to every dated claim, whatever
the date's format. An ADR keeps the rule on and gives each date on its own,
as **Current docs only** in `SKILL.md` says. Only a record whose wording must
stay pinned to a date, such as a research record of what was observed, opts
out. Wrap one passage in `<!-- vale MDCP.DatedClaim = NO -->` and
`<!-- vale MDCP.DatedClaim = YES -->`. For a directory of such records, turn
the rule off in a `.vale.ini` path section such as `[**/research/*.md]` with
`MDCP.DatedClaim = NO`. Put that section last, after every section that
matches the same files, because a later section that sets the rule turns it
back on. **Customizing** in the `@bwilliamson/mdcp-presets` README explains
path sections.

## After any of these

```bash
mdcp compile
mdcp check
mdcp review
```
