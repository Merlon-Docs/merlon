# Evidence check

A review that says something is wrong with a doc makes a claim, and a claim
carried over from a report, a tool, or your own notes can be wrong too. A
finding that two pages repeat a paragraph, that a page cites the wrong
section, or that a shard no longer matches the code is a claim until you have
opened the source and read it. Run this check on every such claim before you
decide what to do about it in the [doc-review workflow](../workflows/doc-review.md),
and in any other workflow's review that reports an error, a duplicate, or a
mismatch in a doc.

## The five steps

Record all five for each claim. A step you cannot fill in is the answer, not a
gap to skip.

1. **Claim, as printed.** Copy the claim word for word from wherever it came
   from: a `merlon review` finding, a lens checklist answer, a report, an issue,
   or your own earlier notes. Name the file and line it is about. A paraphrase
   hides the part that might be wrong.
2. **Opened.** List the files, with paths and lines, or the URLs that you read
   in this session to test the claim. List what you opened, not the citation
   the claim gives. A comparison opens both sides: both pages for a duplicate,
   the shard and the code for a mismatch. When you opened nothing, the verdict
   is **can't tell**.
3. **It says.** Quote what each source says about the claim, in its own words.
   Quote the lines that decide it, not a summary of them.
4. **Verdict and confidence.** Give one verdict and say how confident you are:
   high, moderate, or low, with the reason when it is not high.
5. **One step earlier.** Say what you would have concluded had you stopped
   before the last source you opened. When that differs from the verdict, the
   difference is what the check caught. When the later reading changes the fix,
   the fix follows the later reading.

| Verdict    | The sources show that the claim                                                   |
| ---------- | --------------------------------------------------------------------------------- |
| matches    | is true as stated                                                                 |
| disagrees  | is false: the source says something else                                          |
| missing    | is about something that is not there, such as a file, section, flag, or line      |
| impossible | cannot be true as stated, such as a line past the end of the file                 |
| superseded | was true of an earlier version of the doc, the code, or the tool that reported it |
| can't tell | is not settled by what you opened; say which source would settle it               |

The verdict judges the claim, not the doc. A claim can match and still need no
fix: two parallel reference pages that repeat a paragraph on purpose match a
duplicate finding, and the decision for that finding is **Leave**.

## Act on the verdict

- **matches**, with high or moderate confidence: take the claim to the
  decision step of the workflow.
- **disagrees**, **missing**, **impossible**, or **superseded**: drop the claim,
  and say in your reply that you dropped it and why. When the claim came from a
  tool, such as a `merlon review` signal, and keeps coming back wrong, that is a
  finding for **Raise the floor** in the doc-review workflow.
- **can't tell**, or **matches** with low confidence: edit nothing for it.
  Report it as open, with the source that would settle it.

A check often turns up a problem that the claim missed, such as more copies of
a wrong reference than the claim counted, or a typo in the paragraph it quoted.
Record that as a claim of its own and run the check on it too.

## Where the record goes

Put the record for each claim in your reply. For a claim you act on, also put
it in the commit message of the commit group that acts on it, so the reason
outlives the session. The record does not go in a durable shard: it is review
evidence, not product documentation.

## Example record

<!-- merlon-paths: illustrative -->

1. **Claim:** "`docs/client/install.md` refers to `setup(1)`, but the
   command's page is in section 8."
2. **Opened:** `docs/client/install.md:41`, `man/setup.8`, and every other
   file that a search for `setup(` and the `@SETUP@` placeholder finds.
3. **It says:** `install.md:41` reads "run `setup(1)` as root", and the first
   line of `man/setup.8` reads `.TH SETUP 8`. Two pages under `man/` write
   `@SETUP@(1)`, a placeholder that the build expands to the same wrong
   reference.
4. **Verdict:** matches, high confidence, and the claim undercounts: there are
   three wrong references, not one.
5. **One step earlier:** before searching for the placeholder, I would have
   fixed one reference and left two.
