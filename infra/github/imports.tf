import {
  to = github_repository.merlon
  id = "merlon"
}

import {
  to = github_branch_protection.main
  id = "merlon:main"
}

import {
  to = github_repository_environment.release
  id = "merlon:release"
}

# The repository was renamed from mdcp to merlon. State that still tracks the
# old resource address moves to the new one without a destroy and create.
moved {
  from = github_repository.mdcp
  to   = github_repository.merlon
}
