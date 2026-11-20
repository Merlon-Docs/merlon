# review outcome matrix

The two-by-two table that sorts what a doc review did with each doc, also called a **confusion matrix**. One axis asks whether the doc needed to change, and the other asks whether the review changed it. Its four cells are the [true positive](./true-positive.md), [false negative](./false-negative.md), [false positive](./false-positive.md), and [true negative](./true-negative.md).

In these terms, **positive** means the review flagged or changed the doc, and **negative** means the review left it as it was. **True** and **false** say whether the review was right. A false positive is a **type I error** and a false negative is a **type II error**.

[Review outcomes](../features/system/workflows/doc-review.md#review-outcomes) in the doc-review workflow spec shows the table.
