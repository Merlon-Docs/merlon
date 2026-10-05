# Documentation and software reliability

Why MDCP exists: the link between documentation quality and the cost of unreliable software, stated no more strongly than the sources allow. Its parent is [Vision and roadmap](./00-vision-and-roadmap.md). Public copy that cites these figures follows [Benefit claims and evidence](./benefit-claims-and-evidence.md).

## The scale of the problem

Software failures are expensive, and the published estimates run from hundreds of billions to trillions of US dollars a year.

| Source                                                                                                                                                        | Scope                          | Figure                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| [CISQ, Cost of Poor Software Quality 2022](https://www.it-cisq.org/wp-content/uploads/sites/6/2022/11/CPSQ-Report-Nov-22-2.pdf)                               | United States, 2022            | $2.41 trillion in total, about $1.8 trillion of it from operational failures |
| [Splunk and Oxford Economics, downtime study](https://www.oxfordeconomics.com/resource/the-hidden-costs-of-downtime-the-400b-problem-facing-the-global-2000/) | Forbes Global 2000, 2024       | $400 billion a year in downtime                                              |
| [Siemens, The True Cost of Downtime 2024](https://assets.new.siemens.com/siemens/assets/api/uuid:1b43afb5-2d07-47f7-9eb7-893fe7d0bc59/tcod-2024_original.pdf) | Fortune Global 500 industrials | About $1.4 trillion a year in unplanned downtime                             |

All three are industry studies, and each sponsor sells tools for the problem it measures. Read them as orders of magnitude, not precise totals. Even cut by a factor of ten, each figure stays in the tens of billions of dollars a year or more.

## Documentation is one cause among several

The CISQ report doesn't identify one root cause. Its own focus areas are exploited vulnerabilities, weaknesses in the software supply chain, and technical debt. Missing or stale documentation sits beside those causes:

- **Requirements and intent.** A decision made in a ticket or a pull request and never written down. The next change can undo it.
- **People.** Knowledge that lives in one person's head and leaves with them.
- **Process.** Reviews that can't check intent, because the intent isn't recorded anywhere a reviewer reads.

MDCP addresses the documentation cause only. It doesn't fix vulnerabilities, supply chains or technical debt.

## Why documentation quality matters

DORA's research doesn't claim documentation caused these costs. It finds that documentation quality [drives adoption of technical practices and amplifies their effect](https://dora.dev/capabilities/documentation-quality/) on organizational performance.

- With high-quality documentation, the same technical capabilities deliver about 1.2 to 12.8 times more impact on organizational performance ([DORA 2023](https://dora.dev/research/2023/dora-report/2023-accelerate-state-of-devops-report.pdf)).
- Teams with higher documentation quality are 2.4 times more likely to report better software delivery and operational performance ([DORA 2021](https://dora.dev/research/2021/dora-report/2021-accelerate-state-of-devops-report.pdf)).
- The [DORA AI Capabilities Model](https://dora.dev/ai/) lists AI-accessible internal data and healthy data ecosystems among the practices that multiply the effect of AI adoption.

DORA 2022 and 2023 didn't find a direct effect of documentation quality on software delivery performance alone. The effect is amplification of other capabilities, not a throughput dial.

## Where MDCP fits

There's no substitute for knowing the system. When a project leaves its intent, features and operating knowledge unwritten, from the technical parts to the non-technical ones, the software is released with gaps that someone later pays for.

MDCP is a keystone AI skill for that one cause. It gives the knowledge a place to live that people and agents both read, in small shards that change in the same pull request as the code. `mdcp check` keeps the structure intact. Whether the words are true still depends on the agent following the skill and on human review. See [Usage model](./usage-model.md) for the workflow.

## Related

- [Benefit claims and evidence](./benefit-claims-and-evidence.md): how these figures may be used in public copy
- [Vision and roadmap](./00-vision-and-roadmap.md): what the project is building toward
- [Field report: a fully automated repository](./research/field-report-automated-repository.md): what the checks caught and what they missed
