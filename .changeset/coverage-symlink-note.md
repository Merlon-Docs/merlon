---
'@bwilliamson/mdcp-cli': patch
---

The coverage section of the README now says the scan does not follow symbolic links, so a `standaloneGuides` entry whose path is a symlink is reported as missing. Register the file the link points to.
