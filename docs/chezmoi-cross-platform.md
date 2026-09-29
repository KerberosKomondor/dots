# Chezmoi cross-platform checklist (macOS / Linux / WSL)

Both chezmoi sources (dots → `~/.local/share/chezmoi`, claude-config →
`~/.local/share/chezmoi-claude`) apply to three kinds of machine. Anything
written on one can silently break or be wrong on another. Run this checklist
before editing/adding a template or file in either source, and when reviewing
commits pulled in by a sync that were authored on a different machine.

## The machines

| | macOS | Linux desktop | WSL |
|---|---|---|---|
| `.chezmoi.os` | `darwin` | `linux` | `linux` |
| Detect | `eq .chezmoi.os "darwin"` | `$isLinuxDesktop` | `contains "microsoft" (.chezmoi.kernel.osrelease \| lower)` |
| Home | `/Users/whengely` | `/home/<user>` (username differs per machine, e.g. `appa`) | `/home/<user>` (Windows side under `/mnt/c/Users/...`) |
| Shell tools | BSD coreutils, `/bin/bash` 3.2 | GNU | GNU |
| Packages | Homebrew `/opt/homebrew` | pacman/etc. | apt/etc. |
| GUI / WM | AeroSpace (see `macos.md`) | Hyprland, waybar, systemd user units | usually none; Windows interop |
| Clipboard / open | `pbcopy`, `open` | `wl-copy`, `xdg-open` | `clip.exe`, `wslview` / `explorer.exe` |

Existing gating vars:
- dots `.chezmoiignore.tmpl`: `$isWSL`, `$isLinuxDesktop` (linux, not WSL, `.gui`), `.gui`
- dots data: `class`, `azureDevOpsOrg`, `gui`
- claude-config data: `profile` (`work` / `personal` / `home`) — **profile is not OS**.
  A `work` machine can be macOS, Linux, or WSL. Don't use profile to gate
  OS-specific content or vice versa.

## Checklist

1. **Hardcoded paths** — no `/home/<user>` or `/Users/<user>` in
   templates. Use `{{ .chezmoi.homeDir }}`; in scripts use `$HOME`.
2. **Snapshot / scanner output** — generated content (e.g. the Claude
   `autoMode.environment` block) bakes in facts about the machine and cwd it
   was run on (paths, "0 tracked files", counts). Strip machine-specific
   claims or template them before committing.
3. **Shell portability** — scripts run under macOS `/bin/bash` 3.2 unless the
   shebang says otherwise. Avoid/guard:
   - `mapfile`/`readarray`, `declare -A`, `${var,,}` (bash 4+)
   - `sed -i` (BSD needs `sed -i ''`) — prefer writing to a temp file
   - `grep -P`, `readlink -f`, `date -d`, `stat -c`, `find -printf`,
     `xargs -r`, `timeout` — GNU-only
4. **Tool existence** — hooks, statuslines, and scripts calling
   `zellij`, `rtk`, `jq`, `bw`, `wl-copy`, `pbcopy`, `systemctl`, etc. must
   degrade gracefully where missing (`command -v x >/dev/null && ...; true`)
   or be OS-gated.
5. **Linux-desktop-only config** — Hyprland/waybar/systemd/gtk/fontconfig
   etc. go in the `{{- if not $isLinuxDesktop }}` ignore block. macOS-only
   (AeroSpace, borders, `defaults`) needs an equivalent darwin gate.
6. **WSL specifics** — no systemd unless enabled; GUI may be absent
   (`.gui = false`); Windows-side files have CRLF and no exec bit; `/mnt/c`
   is slow and case-insensitive.
7. **Filesystem** — macOS APFS is case-insensitive by default: two source
   files differing only by case collide. Keep exec bits via `executable_`
   prefix, not local `chmod`.
8. **Homebrew prefix** — `/opt/homebrew` (Apple Silicon) vs `/usr/local` vs
   `/home/linuxbrew/.linuxbrew`. Use `brew --prefix` or PATH, not literals.
9. **Two sources, one `$HOME`** — both repos render into `$HOME`; watch for
   root-level target collisions (a `README.md` in both once collided).

## How to verify

- Render locally: `chezmoi execute-template < <file>.tmpl` (claude-config:
  add `--config ~/.config/chezmoi-claude/chezmoi.toml`). For JSON, pipe to
  `jq .` to validate.
- `.chezmoi.os` / kernel can't be overridden at render time, so for other
  platforms reason through each `if` branch explicitly and list which branch
  each OS takes.
- Scripts: `shellcheck`, and mentally run under bash 3.2 + BSD tools.
- Report findings per OS (macOS / Linux desktop / WSL): OK, gated, or risk +
  suggested fix. Flag risks before committing; don't silently "fix" by
  gating something the user may want everywhere.
