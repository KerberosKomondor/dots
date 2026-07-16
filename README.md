# New System Install

## Pacman

### ui and headless systems

```zsh
pacman -S doas git nvim alsa-utils bluez bluez-utils fatsort accountsservice lazygit
```

### ZSH

[.oh my zsh](https://ohmyz.sh/#install)

```zsh
source ~/.zshrc
git clone https://github.com/MichaelAquilina/zsh-history-filter.git $ZSH/plugins/zsh-history-filter
```

### Guis

```zsh
pacman -S firefox blueberry xfce4-settings flameshot volumeicon udiskie \
  nitrogen rofi polybar solaar nerd-fonts cmus lightdm dex gamemode thunar \
  zenity dunst zathura zathura-cb zathura-pdf-mupdf tickrs
```

## Paru

```zsh
sudo pacman -S --needed base-devel
git clone https://aur.archlinux.org/paru.git
cd paru
makepkg -si
```

### Paru ui and headless systems

```zsh
paru -S tmuxinator tmux-plugin-manager bat eza starship
```

### Paru Guis

```zsh
paru -S google-chrome remmina-plugin-rdesktop freerdp betterlockscreen xss-lock \
 noto-fonts-emoji-git pugixml
```

## macOS

[Homebrew](https://brew.sh)

```zsh
brew install --cask kitty firefox
brew install --cask nikitabobko/tap/aerospace
brew install FelixKratz/formulae/borders
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

## systemctl

```zsh
systemctl --user enable <services in .config/systemctl/user>
```

## Manual Installs

[tmux-plugin-manager](https://github.com/tmux-plugins/tpm)
[mop-tracker](https://github.com/mop-tracker/mop)

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

## Dracula theme

```zsh
mkdir ~/dracula
cd ~/dracula
git clone https://github.com/dracula/zsh.git
ln -s ~/dracula/zsh/dracula.zsh-theme $ZSH/themes/dracula.zsh-theme

```
