resource "github_branch_protection" "main" {
  repository_id = github_repository.merlon.node_id
  pattern       = "main"

  enforce_admins                  = false
  require_signed_commits          = false
  required_linear_history         = false
  require_conversation_resolution = false
  allows_deletions                = false
  allows_force_pushes             = false
  lock_branch                     = false

  required_status_checks {
    strict = true
    contexts = ["Check", "Changeset", "Scan"]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = true
    required_approving_review_count = 0
    require_last_push_approval      = false
  }
}
