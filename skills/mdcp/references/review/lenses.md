# Review lenses

Four reviewers, one pass. Each list is what that reviewer checks; a "no" is a
finding for the [doc-review workflow](../workflows/doc-review.md).

## Product manager

The reader has never seen the project.

- Does the entry page of the consumer guide say what the project is in one
  paragraph, and route each kind of reader to the guide written for them?
- Can a reader learn the purpose and the main outcome from the consumer guides
  alone, without reading contributor docs?
- Is every shipped capability documented, and is every documented capability
  still shipped?
- Does every safeguard name the check that enforces it?
- Would the docs still hold if a second team or a second product line arrived
  tomorrow? Look for one person's name where a role is meant.

## Staff engineer

The reader will change the code.

- Is each claim true of the default branch today? Spot-check commands, file
  paths, flag names, and config keys against the repository.
- Is each rule stated in exactly one shard, with the others linking to it?
  `mdcp review` reports exact duplicates; search for a rule's key phrase to find
  paraphrased copies.
- Does a safeguard or invariant name its enforcing code, hook, or CI gate?
- Is a decision's rationale in an ADR or design shard, not narrated inside a
  how-to?
- Does the architecture overview's component list match the packages and apps in
  the repository?

## Technical writer

The reader skims.

- Does each shard have one audience, one job, and one page type (overview,
  concept, how-to, reference, decision)?
- Does the first paragraph say what the page is for and who it is for?
- Are terms canonical per the project glossary, with vendor names used only where
  the sentence is about that vendor?
- Is the prose present tense, describing the product as it works now?
- Are titles a few plain words that name the page's one job?
- Is a long shard doing two jobs? Length alone is not a reason to split.

## Designer

The reader navigates.

- Can a reader reach any page in two clicks from the docs home or guide index?
- Does each guide index group its entries under headings named for the reader's
  task once it passes about a dozen entries?
- Are sibling titles parallel in form, with no two titles nearly identical?
- Do tables fit the content (comparisons, references), and does a diagram replace
  a flow that would otherwise take three paragraphs?
- Does each page link onward: up to its overview, across to siblings, down to
  detail?
