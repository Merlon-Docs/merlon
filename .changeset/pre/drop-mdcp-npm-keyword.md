---
'@merlon-docs/merlon-docs-cli': patch
'@merlon-docs/merlon-docs-presets': patch
---

Drop the npm keyword `mdcp` from the CLI and presets packages. The old name stays only on the compatibility aliases that a project still needs: `mdcp.config.json` upgrades to `merlon.config.json` until 2.0.0, `protocolVersion` still fills `standardVersion`, the `MdcpConfig` names stay as deprecated exports, and `<!-- mdcp-paths: illustrative -->` is still read.
