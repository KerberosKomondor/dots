# New System Install

## Pacman

### ui and headless systems

```zsh
pacman -S doas git nvim alsa-utils bluez bluez-utils fatsort accountsservice lazygit \
  jq bitwarden-cli zellij chezmoi yazi fzf direnv
```

`chezmoi` bootstraps everything else in this repo — install it before anything below.
`bitwarden-cli` (`bw`) is needed by `res/env_vars.sh.tmpl` (shell login unlocks the vault)
and by chezmoi-claude's `bitwarden` template lookups. Run `bw login` once after install.

### ZSH

[.oh my zsh](https://ohmyz.sh/#install)

```zsh
source ~/.zshrc
git clone https://github.com/MichaelAquilina/zsh-history-filter.git $ZSH/plugins/zsh-history-filter
```

`.zshrc` sets `ZSH_THEME="dracula"` — install the theme now or zsh errors on next launch:

```zsh
mkdir ~/dracula
cd ~/dracula
git clone https://github.com/dracula/zsh.git
ln -s ~/dracula/zsh/dracula.zsh-theme $ZSH/themes/dracula.zsh-theme
```

### Guis

```zsh
pacman -S firefox blueberry xfce4-settings flameshot udiskie \
  nitrogen rofi solaar nerd-fonts cmus lightdm dex \
  zenity zathura zathura-cb zathura-pdf-mupdf mplayer mpd mpc rmpc freerdp hyprlock
```

## Paru

```zsh
doas pacman -S --needed base-devel
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si
```

### Paru ui and headless systems

```zsh
paru -S bat eza starship
```

### Paru Guis

```zsh
paru -S noto-fonts-emoji-git
```

## macOS

[Homebrew](https://brew.sh)

```zsh
brew install --cask kitty firefox
brew install --cask nikitabobko/tap/aerospace
```

AeroSpace (tiling WM, replaces Hyprland — doesn't run on macOS) needs
Accessibility permission granted in System Settings → Privacy & Security →
Accessibility; the prompt/list entry can end up hidden behind other windows.
The app launcher (rofi equivalent) and emoji picker are handled natively via
Spotlight (`Cmd+Space`) and Character Viewer (`Ctrl+Cmd+Space`) — no extra
app needed. See [docs/macos.md](docs/macos.md) for the full window-manager
config, keybindings, and what didn't port over from the Hyprland setup.

## Install NVM

```zsh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
```

## rtk

Custom Claude Code hook tool (Rust Token Killer), not in any repo — built from source:

```zsh
cargo install --git https://github.com/rtk-ai/rtk
```

Needs `cargo` (`pacman -S rust`). No version pin — `cargo install --git` just grabs
whatever's at HEAD when you run it, then never updates itself. To update later:

```zsh
cargo install --git https://github.com/rtk-ai/rtk --force
```

Without it installed, the `rtk hook claude` PreToolUse hook in chezmoi-claude's
`settings.json.tmpl` fails on every Bash call.


## systemctl

```zsh
systemctl --user enable <services in .config/systemctl/user>
```


## Stupid fucking capslock key

localectl set-x11-keymap us pc105 "" ctrl:nocaps,terminate:ctrl_alt_bksp

### old

This method is pretty annoying
[caps2esc](https://www.ejmastnak.com/tutorials/arch/caps2esc/)

## Teams

install teams pwa through chrome then move the file to ~/.local/share/applications/teams.desktop

## /etc

### Use more cores

MAKEFLAGS="-j $(nproc)" in /etc/makepkg.conf

### Use doas instead of sudo

Edit /etc/paru.conf
