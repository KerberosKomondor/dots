# macOS Window Manager (AeroSpace)

Hyprland doesn't run on macOS (it's a Wayland compositor tied to Linux
kernel/DRM APIs). AeroSpace is the closest tiling-WM equivalent — it manages
window position/size via the macOS Accessibility API rather than being a
compositor, so it needs Accessibility permission but no SIP changes.

## Files

- `~/.config/aerospace/aerospace.toml` — main config
- `~/.config/borders/bordersrc` — [JankyBorders](https://github.com/FelixKratz/JankyBorders) config (colored focus border; AeroSpace itself draws no window decoration)

## Install

```zsh
brew install --cask nikitabobko/tap/aerospace
brew install FelixKratz/formulae/borders
```

AeroSpace needs Accessibility permission (System Settings → Privacy &
Security → Accessibility). The prompt/list entry can end up hidden behind
other windows — check there before assuming it didn't appear.

## Window Manager Setup

- Mod key: **Alt** (not Cmd/Super — Cmd collides with macOS system shortcuts like Cmd+Q/Cmd+W)
- Layout: `tiles` (BSP), matching Hyprland's dwindle
- Theme: Dracula (border active = `#8be9fd`, inactive = `#44475a`), drawn by JankyBorders since AeroSpace has no decoration of its own
- Workspaces: 1=browser (Brave), 2=kitty, 3=Teams, 4=Remote Desktop, 10=Messages — assigned via `on-window-detected` rules, mirroring the hyprland.lua `window_rule` workspace assignments
- Launcher / emoji picker: no bind, handled natively — Spotlight (`Cmd+Space`) and Character Viewer (`Ctrl+Cmd+Space`). Raycast was tried first (see git history) but removed in favor of these built-ins.

## Approximated / Dropped from the Hyprland config

AeroSpace has no equivalent for these, so they're either approximated with the
closest available primitive or dropped entirely — see comments at the top of
`aerospace.toml` for the full list:

- dwindle "preselect" split direction → approximated with `join-with`
- dwindle "togglesplit" → `layout tiles horizontal vertical` toggle
- dwindle "focusmaster" (master-window concept) → **no equivalent**, BSP tree has no master/stack notion
- Window rounding/blur/shadow/animations → **not possible**; macOS WindowServer draws window chrome, not the tiling WM
- rofi, cliphist, pactl volume, dictate-daemon, xfreerdp/teams-tile scripts → Linux-specific tooling, not ported
- Volume keys → unnecessary, macOS hardware media keys already work natively

## System defaults

`res/macos-defaults.sh` — Dock auto-hide (no delay, fast animation) so
AeroSpace can tile into the space the Dock would otherwise reserve. Run it
after a fresh install / macOS reset.

## Known gotcha: focus vs. visibility

`move-node-to-workspace` (and other window commands) act on whichever window
currently has **input focus**, not whichever is merely visible on screen. If a
window looks "active" but was never actually clicked into, AeroSpace's focus
pointer can still be on a previously-focused window — same behavior as
Hyprland's `dispatch movetoworkspace`. Click (or `alt-hjkl` focus) into the
window you want to target before running a move/close command on it.
