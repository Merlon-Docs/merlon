resource "github_repository" "merlon" {
  name        = "merlon"
  description = "Merlon Docs: a documentation system for software projects, run by an Agent Skill with human review"
  homepage_url = "https://www.skills.sh/Merlon-Docs/merlon"

  visibility = "public"
  archived   = false

  has_issues      = true
  has_projects    = true
  has_wiki        = true
  has_discussions = true

  allow_squash_merge   = true
  allow_merge_commit   = false
  allow_rebase_merge   = false
  allow_auto_merge     = true
  delete_branch_on_merge = false

  squash_merge_commit_title   = "COMMIT_OR_PR_TITLE"
  squash_merge_commit_message = "COMMIT_MESSAGES"

  topics = ["ai", "ai-tools", "skills-sh"]

  web_commit_signoff_required = false

  security_and_analysis {
    secret_scanning {
      status = "enabled"
    }
    secret_scanning_push_protection {
      status = "enabled"
    }
  }
}

