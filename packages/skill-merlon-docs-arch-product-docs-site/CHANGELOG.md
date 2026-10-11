# @merlon-docs/skill-merlon-docs-arch-product-docs-site

## 0.7.2

### Patch Changes

- d60f90d: Move skill version carriers and CHANGELOGs to packages/skill-* so npx skills add installs stay free of release metadata; publish skill notes on GitHub Releases in the same single-step main release job as npm packages.

## 0.7.1

### Patch Changes

- e017c43: Version packages and Agent Skills independently via Changesets; release on merge to main through the Version Packages PR. Major bumps stay blocked until maintainers open 1.0.
