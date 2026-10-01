# Consolidation playbook

How to merge, split, move, and retire shards without breaking a link. Run
`mdcp check` after each operation. It reports every link the change broke.

## Move or rename

1. `git mv` the shard to its new path.
2. Search the docs root for the old path (relative links use different prefixes
   from different directories, so search for the file name) and update every
   link in the same commit.
3. Move the entry in both guide indexes: remove it from the old guide's
   `index.md` and add it where it belongs in the new one.
4. If the project publishes its docs as a site, add a redirect from the old URL
   using that site's mechanism.

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
- "Used to…" or "until \<date>…" → the current behavior. Move the reason to an
  ADR if it still matters.

## After any of these

```bash
mdcp compile
mdcp check
mdcp review
```
