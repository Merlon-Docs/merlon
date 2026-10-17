---
'@merlon-docs/merlon-docs-core': patch
---

The core README's Extension pattern section says where a custom hook runs. A process registers the hook before it calls `compileGuideResults` or `compileGuides`, and the Merlon Docs CLI doesn't load one. Compile skips a name in `compile.hooks` that has no registered hook, without a warning. It shows a `compile.hooks` array that keeps the built-in hooks next to a custom one, and lists the `CompileHookContext` fields a hook gets.
