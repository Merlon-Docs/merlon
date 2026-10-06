---
'@bwilliamson/skill-mdcp': patch
---

The getting-started workflow now settles Vale before the first `mdcp check`. When Vale is installed and the user has not asked for prose linting, it writes a placeholder `.vale.ini` in the docs root and says prose linting is off. A fresh scaffold now passes `mdcp check` instead of failing on the missing file.
