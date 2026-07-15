# Neovim

## Prereqs

### Pacman requirements

```sh
sudo pacman -S go \
  luarocks \
  wget \
  ruby \
  fd \
  ripgrep \
  fzf \
  xclip \
  python3 \
  jq \
  tidy \
  stylua \
  luacheck \
  clang \
  cmake \
  sqlite \
  lazygit
```

### AUR requirements

```sh
paru -S nvm \
  python-pynvim-git \
  ruby-neovim \
  jira-cli-bin
```

### NPM requirements

```sh
npm i -g eslint_d \
  @fsouza/prettierd \
  eslint \
  prettier \
  @styled/typescript-styled-plugin \
  typescript-styled-plugin \
  neovim \
  tree-sitter-cli
```

## RUN CHECKHEALTH

run :checkhealth from inside nvim and fix other issues
