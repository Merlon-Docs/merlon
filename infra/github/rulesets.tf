# develop can't be deleted; repository admins can still repair it. The ruleset doesn't block
# force-pushes: sync-develop.yml resets develop to main with GITHUB_TOKEN, and GitHub only lets a
# ruleset exempt apps the organization installed, which the built-in GitHub Actions app isn't.
resource "github_repository_ruleset" "develop" {
  name        = "develop"
  repository  = github_repository.merlon.name
  target      = "branch"
  enforcement = "active"

  conditions {
    ref_name {
      include = ["refs/heads/develop"]
      exclude = []
    }
  }

  rules {
    deletion = true
  }

  bypass_actors {
    actor_id    = 5
    actor_type  = "RepositoryRole"
    bypass_mode = "always"
  }
}
