variable "owner" {
  description = "GitHub user or organization that owns the repository"
  type        = string
  default     = "Merlon-Docs"
}

variable "release_reviewer" {
  description = "GitHub user who approves deployments to the release environment. It must be a user, not an organization: an organization's ID leaves the environment with no reviewer."
  type        = string
  default     = "betsalel-williamson"
}
