module landing

/*
 * How develop and main move in this repository.
 *
 * Explained in docs/developer/formal-models.md; run with `pnpm formal:check`.
 *
 * Each step is one event, labelled in Step.kind. A Tree stands for file
 * contents, and a tree joins Tested when a gate or CI run passes on it. Test
 * quality is out of scope: a run that happens passes. Guards are the branch
 * rules and workflow choices the safety properties depend on. Every command
 * says which guards it assumes and declares its result: `expect 0` for a
 * property that holds, `expect 1` for a counterexample or a reachable scenario.
 *
 * Modelled from the workflows. land-develop.yml runs the gate on the merge and
 * pushes it with GITHUB_TOKEN, which starts no workflow. sync-develop.yml pushes
 * its merge to land/sync-main and dispatches land-develop.yml on it, which is
 * the SyncThroughGate guard; the sync step here includes that landing.
 * ci.yml runs on a pull request when it opens
 * and when a person pushes its head, never when its base changes; the
 * CIOnRetarget guard adds that run. A check's latest run on a head commit is
 * the one a branch rule reads.
 * release-source.yml runs the Release source job on pull requests into main,
 * also when a base changes to main, which is the ReleaseSourceOnRetarget guard.
 * On any other base the model counts that check as passing, since only main
 * can require it. release.yml pushes the version commit to main with a
 * maintainer token.
 *
 * Bounded: every check covers traces of up to seven steps over six commits and
 * one pull request, which is enough for each counterexample below to appear.
 *
 * Assumed throughout: force-push to develop and main is blocked, while a
 * pushed branch may move to any commit, as the sync's force-push of
 * land/sync-main does. Merges are clean (two commits merge to one tree, so
 * sync-develop never opens its conflict PR), and code owner approval is given
 * whenever it is needed. No branch or PR changes the workflow that checks it,
 * although a pushed branch runs its own copy of land-develop.yml and a PR its
 * own copy of ci.yml and release-source.yml.
 */

sig Tree {}

sig Commit {
  tree: one Tree,
  parents: set Commit
}

fact acyclic { no c: Commit | c in c.^parents }
fact cleanMerges { all c1, c2: Commit | (not lone c1.parents and c1.parents = c2.parents) implies c1.tree = c2.tree }

fun history[c: Commit]: set Commit { c.*parents }

-- m is what git produces when `from` is merged into `onto`: nothing, a fast-forward, or a merge commit.
pred result[m, onto, from: Commit] {
  from in history[onto] implies m = onto
  else (onto in history[from] implies m = from
  else m.parents = onto + from)
}

abstract sig Branch { var tip: lone Commit }
one sig Develop, Main extends Branch {}
sig Land extends Branch {}    -- claude/** and land/**
sig Hotfix extends Branch {}  -- hotfix/*
sig Topic extends Branch {}   -- any other branch, Dependabot's included

var sig Tested in Tree {}

sig PR {
  head: one Branch - Main,
  var base: lone Develop + Main,
  var ran: Commit -> Commit,   -- head commit -> base tip its latest CI run was against
  var sourceOk: set Commit     -- head commits whose Release source job passed or was skipped
}
var sig Open in PR {}

abstract sig Guard {}
one sig
  NoDirectPushToDevelop,    -- branch rule: people cannot push develop; the land workflow, which also lands the sync, still can
  UpToDatePRsToDevelop,     -- branch rule: a PR's head must contain develop's tip before it merges; workflow pushes exempt
  SyncThroughGate,          -- sync-develop starts the land gate on its merge instead of pushing it
  CIOnRetarget,             -- ci.yml also runs when a PR's base changes
  ReleaseSourceRequired,    -- branch rule: the Release source check is required on main
  ReleaseSourceOnRetarget,  -- the Release source job also runs when a PR's base changes
  NoDirectPushToMain,       -- branch rule: people cannot push main; only the release job can
  UpToDatePRsToMain,        -- branch rule: a PR's head must contain main's tip before it merges
  ReleaseCommitGated        -- release.yml runs the full gate before it pushes the version commit
  extends Guard {}
sig On in Guard {}

abstract sig Kind {}
one sig KNone, KPush, KLand, KSync, KPushDevelop, KPushMain, KRelease, KOpen, KRetarget, KMerge extends Kind {}
one sig Step { var kind: one Kind }

pred keepTips[bs: set Branch] { all b: bs | b.tip' = b.tip }
pred keepPRs { Open' = Open and base' = base }
pred keepCI[ps: set PR] { all p: ps | p.ran' = p.ran and p.sourceOk' = p.sourceOk }

-- The Release source job on PR p, for its head and base after this step. On a
-- base other than main it counts as passing.
pred sourceCheck[p: PR] {
  (p.base' = Main and p.head not in Develop + Hotfix)
    implies p.sourceOk' = p.sourceOk - (p.head.tip)'
    else p.sourceOk' = p.sourceOk + (p.head.tip)'
}

-- ci.yml runs on every PR in ps, against its head and base after this step,
-- and tests the merge of the two. Its new run replaces any earlier one on that head.
pred runCI[ps: set PR] {
  all p: ps | some m: Commit | result[m, (p.base.tip)', (p.head.tip)']
  all p: ps | p.ran' = p.ran ++ (p.head.tip)' -> (p.base.tip)'
  all p: PR - ps | p.ran' = p.ran
  Tested' = Tested + { t: Tree | some p: ps, m: Commit | result[m, (p.base.tip)', (p.head.tip)'] and t = m.tree }
}

-- Every pull request workflow runs on the PRs in ps.
pred ci[ps: set PR] {
  runCI[ps]
  all p: ps | sourceCheck[p]
  all p: PR - ps | p.sourceOk' = p.sourceOk
}

-- A person pushes a branch. CI reruns on the open PRs from it.
pred push[b: Land + Hotfix + Topic, c: Commit] {
  Step.kind = KPush
  c != b.tip
  b.tip' = c
  keepTips[Branch - b]
  keepPRs
  ci[Open & head.b]
}

-- land-develop.yml: gate the merge of develop and the pushed branch, then push it to develop.
pred land[b: Land, m: Commit] {
  Step.kind = KLand
  some b.tip
  result[m, Develop.tip, b.tip]
  m != Develop.tip
  Develop.tip' = m
  Tested' = Tested + m.tree
  keepTips[Branch - Develop]
  keepPRs
  keepCI[PR]
}

-- sync-develop.yml: after main moves, carry it into develop, gated or not.
pred sync[m: Commit] {
  Step.kind = KSync
  Main.tip not in history[Develop.tip]
  result[m, Develop.tip, Main.tip]
  Develop.tip' = m
  SyncThroughGate in On implies Tested' = Tested + m.tree else Tested' = Tested
  keepTips[Branch - Develop]
  keepPRs
  keepCI[PR]
}

-- A maintainer pushes develop directly. CI reruns on the release PR.
pred pushDevelop[c: Commit] {
  Step.kind = KPushDevelop
  NoDirectPushToDevelop not in On
  Develop.tip in c.^parents
  Develop.tip' = c
  keepTips[Branch - Develop]
  keepPRs
  ci[Open & head.Develop]
}

-- A maintainer pushes main directly, which the release job's token makes possible.
pred pushMain[c: Commit] {
  Step.kind = KPushMain
  NoDirectPushToMain not in On
  Main.tip in c.^parents
  Main.tip' = c
  keepTips[Branch - Main]
  keepPRs
  keepCI[PR]
  Tested' = Tested
}

-- release.yml: the version commit goes onto main.
pred releaseCommit[c: Commit] {
  Step.kind = KRelease
  c.parents = Main.tip
  Main.tip' = c
  ReleaseCommitGated in On implies Tested' = Tested + c.tree else Tested' = Tested
  keepTips[Branch - Main]
  keepPRs
  keepCI[PR]
}

pred openPR[p: PR, b: Develop + Main] {
  Step.kind = KOpen
  p not in Open
  some p.head.tip
  b != p.head
  Open' = Open + p
  p.base' = b
  all q: PR - p | q.base' = q.base
  keepTips[Branch]
  ci[p]
}

-- Someone changes an open PR's base branch. ci.yml reruns only with the
-- CIOnRetarget guard, and the Release source job only with ReleaseSourceOnRetarget.
pred retarget[p: PR, b: Develop + Main] {
  Step.kind = KRetarget
  p in Open
  b != p.base
  b != p.head
  p.base' = b
  all q: PR - p | q.base' = q.base
  Open' = Open
  keepTips[Branch]
  CIOnRetarget in On implies runCI[p] else (Tested' = Tested and all q: PR | q.ran' = q.ran)
  ReleaseSourceOnRetarget in On implies sourceCheck[p] else p.sourceOk' = p.sourceOk
  all q: PR - p | q.sourceOk' = q.sourceOk
}

-- A maintainer merges an open PR once its required checks pass on its head.
-- GitHub's up-to-date rule asks only that the head contain the base's tip; it
-- does not ask which base the latest run was against.
pred mergePR[p: PR, m: Commit] {
  Step.kind = KMerge
  p in Open
  let B = p.base, h = p.head.tip | {
    result[m, B.tip, h]
    m != B.tip
    some p.ran[h]
    (B = Develop and UpToDatePRsToDevelop in On) implies Develop.tip in history[h]
    (B = Main and UpToDatePRsToMain in On) implies Main.tip in history[h]
    (B = Main and ReleaseSourceRequired in On) implies h in p.sourceOk
    B.tip' = m
    keepTips[Branch - B]
    Open' = Open - p
    base' = base
    -- The merge is a person's push, so CI reruns on open PRs whose head is the base.
    ci[(Open - p) & head.B]
  }
}

pred stutter {
  Step.kind = KNone
  keepTips[Branch]
  keepPRs
  keepCI[PR]
  Tested' = Tested
}

fact init {
  some r: Commit {
    no r.parents
    Develop.tip = r
    Main.tip = r
    Tested = r.tree
  }
  no (Land + Hotfix + Topic).tip
  no Open
  no base
  no ran
  no sourceOk
}

fact transitions {
  always (
    stutter
    or (some b: Land + Hotfix + Topic, c: Commit | push[b, c])
    or (some b: Land, m: Commit | land[b, m])
    or (some m: Commit | sync[m])
    or (some c: Commit | pushDevelop[c] or pushMain[c] or releaseCommit[c])
    or (some p: PR, b: Develop + Main | openPR[p, b] or retarget[p, b])
    or (some p: PR, m: Commit | mergePR[p, m])
  )
}

-- develop only ever points at a tree a gate or CI run passed on.
pred developTested { always Develop.tip.tree in Tested }

-- main only ever points at a tree a gate or CI run passed on.
pred mainTested { always Main.tip.tree in Tested }

-- main moves only by merging develop or a hotfix branch, or by the release commit.
pred mainFromReleaseSources {
  always (Main.tip' != Main.tip implies
    (Step.kind = KRelease or (Step.kind = KMerge and some p: PR, m: Commit | mergePR[p, m] and p.base = Main and p.head in Develop + Hotfix)))
}

let developGuards = NoDirectPushToDevelop + UpToDatePRsToDevelop + SyncThroughGate + CIOnRetarget
let mainTreeGuards = NoDirectPushToMain + UpToDatePRsToMain + ReleaseCommitGated + CIOnRetarget
let mainSourceGuards = NoDirectPushToMain + ReleaseSourceRequired + ReleaseSourceOnRetarget

-- develop: the four guards together suffice, and each is needed.
check DevelopTested { developGuards in On implies developTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 0 Hotfix, 1..7 steps expect 0
check DevelopTestedWithoutNoDirectPush { On = developGuards - NoDirectPushToDevelop implies developTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 0 Hotfix, 1..7 steps expect 1
check DevelopTestedWithoutUpToDatePRs { On = developGuards - UpToDatePRsToDevelop implies developTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 0 Hotfix, 1..7 steps expect 1
check DevelopTestedWithoutGatedSync { On = developGuards - SyncThroughGate implies developTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 0 Hotfix, 1..7 steps expect 1
check DevelopTestedWithoutRetargetCI { On = developGuards - CIOnRetarget implies developTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 0 Hotfix, 1..7 steps expect 1

-- main's trees: the four guards together suffice, and each is needed.
check MainTested { mainTreeGuards in On implies mainTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 0
check MainTestedWithoutNoDirectPush { On = mainTreeGuards - NoDirectPushToMain implies mainTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1
check MainTestedWithoutUpToDatePRs { On = mainTreeGuards - UpToDatePRsToMain implies mainTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1
check MainTestedWithoutGatedRelease { On = mainTreeGuards - ReleaseCommitGated implies mainTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1
check MainTestedWithoutRetargetCI { On = mainTreeGuards - CIOnRetarget implies mainTested }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1

-- main's sources: the three guards together suffice, and each is needed.
check MainFromReleaseSources { mainSourceGuards in On implies mainFromReleaseSources }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 0
check MainSourcesWithoutNoDirectPush { On = mainSourceGuards - NoDirectPushToMain implies mainFromReleaseSources }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1
check MainSourcesWithoutReleaseSource { On = mainSourceGuards - ReleaseSourceRequired implies mainFromReleaseSources }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1
check MainSourcesWithoutRetargetRun { On = mainSourceGuards - ReleaseSourceOnRetarget implies mainFromReleaseSources }
  for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 1 Hotfix, 1..7 steps expect 1

-- With every guard on, the normal paths still work, so the checks above are not vacuous.
run LandThenRelease {
  On = Guard
  eventually (Step.kind = KLand and eventually (some p: PR, m: Commit | mergePR[p, m] and p.head = Develop))
} for 4 but 6 Commit, 1 PR, 1 Land, 0 Topic, 0 Hotfix, 1..7 steps expect 1

run ReleaseSyncsBack {
  On = Guard
  eventually (some c: Commit | releaseCommit[c] and eventually c in history[Develop.tip])
} for 4 but 6 Commit, 1 PR, 1 Land, 0 Topic, 0 Hotfix, 1..7 steps expect 1

run DependabotMerges {
  On = Guard
  eventually (Step.kind = KOpen and eventually (Step.kind = KLand
    and eventually (some p: PR, m: Commit | mergePR[p, m] and p.head in Topic and p.base = Develop)))
} for 4 but 6 Commit, 1 PR, 1 Land, 1 Topic, 0 Hotfix, 1..7 steps expect 1

run HotfixReachesDevelop {
  On = Guard
  eventually (some p: PR, m: Commit | mergePR[p, m] and p.head in Hotfix and p.base = Main
    and eventually p.head.tip in history[Develop.tip])
} for 4 but 6 Commit, 1 PR, 1 Land, 0 Topic, 1 Hotfix, 1..7 steps expect 1
