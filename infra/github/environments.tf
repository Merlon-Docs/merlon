data "github_user" "maintainer" {
  username = var.owner
}

resource "github_repository_environment" "release" {
  repository  = github_repository.merlon.name
  environment = "release"

  can_admins_bypass   = true
  prevent_self_review = false

  reviewers {
    users = [data.github_user.maintainer.id]
  }

  # Deployment branch policy (main branch + v* tags) and individual branch
  # policies are configured in the GitHub UI — the provider requires an
  # organization context for these settings on personal repos.
  deployment_branch_policy {
    protected_branches     = false
    custom_branch_policies = true
  }
}
