---
'@merlon-docs/merlon-docs-core': minor
'@merlon-docs/merlon-docs-cli': minor
---

Add the `html` reader (`htmlFormat`) for hand-written HTML docs, so `merlon check --no-compile` and `merlon review --no-compile` can read a tree such as ncurses' `doc/html`. Headings are `<h1>`–`<h6>`, the title is the first `<h1>` or else `<title>`, block-level elements split prose, and `<pre>`, `<script>`, `<style>` and comments are left out. `<a href>` links, `id` attributes and `<a name>` anchors are checked, and links to other HTML pages make them reachable from `roots`.
