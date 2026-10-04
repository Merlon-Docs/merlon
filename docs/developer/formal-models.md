# Formal models

Some parts of this repository run as state machines: branches that move under rules, and workflows that must run in a set order. Tests and prose cover single runs of them. An [Alloy](https://alloytools.org) model describes every order in which the events can happen, up to a bound. The Alloy Analyzer searches all of those orders for a run that breaks a stated property.

The models live in `formal/alloy/`. Every command in a model declares the result it must produce. `expect 0` means no instance may exist, because a property holds or a scenario is impossible. `expect 1` means one must exist: a counterexample that proves a guard is needed, or a scenario that proves the model can do real work. `pnpm formal:check` runs every model. It fails when a command misses its expectation or does not declare one. CI runs it in the Formal models job. The [land gate](./versioning-and-releases.md#landing-on-develop) runs it when a branch changes anything under `formal/` or the formal-check scripts.

## Running the models

`pnpm formal:check` needs Java 17 or later on `PATH`. On first use it downloads the pinned Alloy release from Maven Central into `.caches/alloy/` and verifies its SHA-256 checksum. It uses the Glucose solver bundled in the Alloy jar, which is many times faster here than the default. The landing model takes about three minutes on a four-core machine.

To read a counterexample, run one command with the Alloy CLI and open the trace it writes:

```bash
java -jar .caches/alloy/alloy-6.2.0.jar exec -f -s glucose -c DevelopTestedWithoutGatedSync \
  -t text -o .caches/alloy/out formal/alloy/landing.als
```

The trace lists the states in order. In each state, `Step.kind` names the event that comes next, and the rest shows the commit every branch points at and the trees a gate or CI run passed on.

## Landing and release

`formal/alloy/landing.als` models the events that move `develop` or `main`. A landing and the sync from `main` move `develop`, the release commit moves `main`, and a PR merge or a maintainer's direct push can move either branch. It also models CI on pull requests, including a PR whose base branch changes after it opens.

The model checks three properties. Each one is true only while all of its guards are in place, and for each guard a check finds a run that breaks the property without it. A guard is either a branch rule, which is a repository setting that no workflow can enforce, or a choice in a workflow under `.github/workflows/`.

### `develop` only moves to a tested tree

| Guard                                         | Kind        | What goes wrong without it                                                                      |
| --------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| People cannot push `develop` directly         | Branch rule | A maintainer's push puts untested work on `develop`                                             |
| A PR into `develop` must be up to date        | Branch rule | A Dependabot PR merged after `develop` moved puts a merge no CI run tested on `develop`         |
| CI runs again when a PR's base changes        | Workflow    | A PR tested against `main` and then moved to `develop` merges on that old run                   |
| The sync from `main` runs through a land gate | Workflow    | The sync puts the release commit, or its merge with newer `develop` work, on `develop` untested |

GitHub's up-to-date rule asks only that a PR's head contain the base branch's latest commit. It does not ask which base CI last ran against, and CI does not run on the `edited` event that a base change sends. GitHub proposes `main` as the base of a new PR. If its author then moves it to `develop`, as the Release source check asks, it can merge on its run against `main`.

The sync in `.github/workflows/sync-develop.yml` pushes a clean merge to the `land/sync-main` branch and dispatches the land workflow on it. A push made with the workflow's own `GITHUB_TOKEN` doesn't start a workflow, but a dispatch does. The land gate then tests the merge like any other landing, and `develop` moves only when the gate passes. Without that gate, an untested merge that broke `develop` would fail every later landing until someone fixed `develop`.

Only the land workflow pushes `develop`, with that `GITHUB_TOKEN`. So both branch rules for `develop` have to exempt the identity it pushes as. Otherwise they block landings along with everyone else. The sync force-pushes `land/sync-main` as the same identity, so a rule that blocks force-push has to leave that branch out.

### `main` only moves to a tested tree

| Guard                                          | Kind        | What goes wrong without it                                                     |
| ---------------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| People cannot push `main` directly             | Branch rule | A maintainer's push puts untested work on `main`                               |
| A PR into `main` must be up to date            | Branch rule | A release PR merged after `main` moved puts a merge no CI run tested on `main` |
| CI runs again when a PR's base changes         | Workflow    | A PR tested against `develop` and then moved to `main` merges on that old run  |
| The release job runs the gate before it pushes | Workflow    | The version commit reaches `main` with less than a landing's gate behind it    |

Before the release job in `.github/workflows/release.yml` pushes the version commit, it builds and validates the skills, and the pre-commit hook checks the packages it bumped, which is less than the gate a landing runs. The job also pushes with a maintainer's personal access token. A rule that blocks direct pushes to `main` would block the release as well. Exempting the maintainer whose token the job uses would let that maintainer push by hand too. Closing that path needs an identity for the release job that the rule can exempt on its own.

### `main` only merges `develop` or `hotfix/*`

| Guard                                              | Kind        | What goes wrong without it                                              |
| -------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| People cannot push `main` directly                 | Branch rule | A maintainer's push moves `main` without any PR                         |
| The Release source check is required on `main`     | Branch rule | A PR from any branch merges once a code owner approves it               |
| Release source runs again when a PR's base changes | Workflow    | A PR opened against `develop` and then moved to `main` merges unchecked |

The third guard is in place. `.github/workflows/release-source.yml` runs on the `edited` event, which GitHub sends when a PR's base changes, and CI does not run on that event.

### Scenarios and bounds

With every guard on, the model also runs scenarios that show the checks above are not vacuous. A landing is followed by a release PR. The release commit syncs back to `develop`. A Dependabot PR merges into `develop` after a landing moves it, and a hotfix merged into `main` reaches `develop`.

Every check covers traces of up to seven steps over six commits and one pull request. A passing check means no counterexample exists within that bound, which is large enough for each counterexample above to appear. The model assumes merges are clean and that force-push to `develop` and `main` is blocked. A pushed branch may move to any commit, as the sync's force-push of `land/sync-main` does. It also assumes a code owner approves whenever a rule requires it, and that no branch changes the workflow that checks it. A pushed branch runs its own copy of the land workflow, and a PR runs its own copy of CI and Release source. On a PR into `main`, code owner review of `.github/` is what catches such a change. A landing's copy of the land workflow runs before anyone reviews it.

## Adding a model

Model a part of the system when it runs as a sequence of states and a wrong order of events would break it. Start the model with a comment that points to the shard explaining it. Give every command an `expect`, and choose scopes small enough that `pnpm formal:check` finishes within a few minutes.
