# develop can't be deleted or force-pushed. Repository admins can still repair
# it, and GitHub Actions can, for sync-develop.yml's reset of develop to main.
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
    deletion         = true
    non_fast_forward = true
  }

  bypass_actors {
    actor_id    = 5
    actor_type  = "RepositoryRole"
    bypass_mode = "always"
  }

  bypass_actors {
    actor_id    = 15368
    actor_type  = "Integration"
    bypass_mode = "always"
  }
}
