# Claude Code

## Trust dialog ("Do you trust the files in this folder?")

- Per-folder trust stored in `~/.claude.json` under `projects["<path>"].hasTrustDialogAccepted`.
- Trust covers the folder's whole subtree (git repo root for repos).
- No global disable — it's a per-directory security check. Headless (`claude -p`) and SDK sessions never show it.
- 2026-09-01: set `hasTrustDialogAccepted: true` for `/home/whengely` (was `false`; `/home/whengely/code` was already trusted). Backup saved at `~/.claude.json.bak`.
- Home-folder trust subsumes everything under it, so individual repo entries no longer trigger the prompt.
