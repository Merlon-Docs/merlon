# ncurses documentation migration

<!-- merlon-paths: illustrative -->

Written on 2026-11-15, from the [betsalel-williamson/ncurses](https://github.com/betsalel-williamson/ncurses) repository at commit `568319e`, its pull requests #1 to #60, and the survey and trial files kept beside the work.

[ncurses](https://invisible-island.net/ncurses/) is the C library that most Unix terminal programs draw their screens with. Its documentation has grown over three decades in several formats: 133 troff manual pages, hand-written HTML guides such as the _NCURSES Programming HOWTO_ (7,570 lines) and _Writing Programs with NCURSES_ (3,390 lines), the hacker's guide, the Ada95 binding guide, and a plain-text `INSTALL` of 2,592 lines. A fork of the library moved that documentation into Merlon Docs shards and publishes it at <https://betsalel-williamson.github.io/ncurses/>.

A coding agent did the work with the Merlon Docs Agent Skill. One maintainer reviewed and merged every pull request.

| Measure                                   | Value                                       | Source                                                                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pull requests merged                      | 60, between 2026-11-14 and 2026-11-15       | the repository's pull request list                                                                                                                                                          |
| Manual pages sharded                      | 133 of 133, as 1,187 troff fragments        | [`site/data/migration-history.json`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/site/data/migration-history.json), files under `docs/man` |
| Markdown shards                           | 157                                         | files under `docs/` ending in `.md`                                                                                                                                                         |
| Guides and contributor documents reviewed | 15 of 15 guides, 4 of 4 contributor docs    | [`site/data/migration-history.json`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/site/data/migration-history.json)                         |
| Errata rows                               | 302, of which 159 correct the original text | [`docs/appendix/errata.csv`](https://github.com/betsalel-williamson/ncurses/blob/568319e5809ad365ba195ebbd100946c53b42cb4/docs/appendix/errata.csv)                                         |
| Site progress bar                         | 56%                                         | the site's front page                                                                                                                                                                       |

**Caveats:** this is one project, whose 60 pull requests merged over about 26 hours, and the maintainer who reviewed it also maintains Merlon Docs. The figures describe this migration only. The manual pages are sharded but haven't had an editorial review, so the review figures cover the guides and contributor docs only.

[How the ncurses migration ran](./process.md) covers the process, [What the ncurses migration produced](./outcomes.md) the outcomes, and [What the ncurses trial explored](./exploratory-results.md) the exploratory results.
