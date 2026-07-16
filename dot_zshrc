# If you come from bash you might have to change your $PATH.
#export PATH=$HOME/bin:/usr/local/bin:$HOME/go/bin:$HOME/.cargo/bin/:$PATH

# Path to your oh-my-zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load. Optionally, if you set this to "random"
# it'll load a random theme each time that oh-my-zsh is loaded.
# See https://github.com/robbyrussell/oh-my-zsh/wiki/Themes
#ZSH_THEME="muse"
ZSH_THEME="dracula"

# More dracula theming
~/res/dracula-tty.sh
export FZF_DEFAULT_OPTS='--color=fg:#f8f8f2,bg:#282a36,hl:#bd93f9 --color=fg+:#f8f8f2,bg+:#44475a,hl+:#bd93f9 --color=info:#ffb86c,prompt:#50fa7b,pointer:#ff79c6 --color=marker:#ff79c6,spinner:#ffb86c,header:#6272a4'

#FZF settings
source /usr/share/fzf/key-bindings.zsh
source /usr/share/fzf/completion.zsh

# Don't save commands starting with a space to history
setopt HIST_IGNORE_SPACE

# Set list of themes to load
# Setting this variable when ZSH_THEME=random
# cause zsh load theme from this variable instead of
# looking in ~/.oh-my-zsh/themes/
# An empty array have no effect
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion. Case
# sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment the following line to disable bi-weekly auto-update checks.
# DISABLE_AUTO_UPDATE="true"

# Uncomment the following line to change how often to auto-update (in days).
# export UPDATE_ZSH_DAYS=13

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load? (plugins can be found in ~/.oh-my-zsh/plugins/*)
# Custom plugins may be added to ~/.oh-my-zsh/custom/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
  ssh-agent gitfast npm screen zsh-history-filter
)

zstyle :omz:plugins:ssh-agent identities komondor-github-id_ed25519 github-id_ed25519 work-id_rsa

source $ZSH/oh-my-zsh.sh

# User configuration

# You may need to manually set your language environment
export LANG=en_US.UTF-8

# Compilation flags
# export ARCHFLAGS="-arch x86_64"

# ssh
export SSH_KEY_PATH="~/.ssh/id_rsa"
# Use kitty's SSH kitten when inside kitty — auto-copies xterm-kitty terminfo to remote
[[ "$TERM" == "xterm-kitty" ]] && alias ssh="kitty +kitten ssh"

# dotnet
export DOTNET_ROOT="/usr/share/dotnet"
export MSBuildSDKsPath="$DOTNET_ROOT/sdk/$(${DOTNET_ROOT}/dotnet --version)/Sdks"
export DOTNET_RUNTIME_IDENTIFIER=linux-x64
export DOTNET_RUNTIME_ID=linux-x64
# zsh parameter completion for the dotnet CLI

_dotnet_zsh_complete()
{
  local completions=("$(dotnet complete "$words")")

  # If the completion list is empty, just continue with filename selection
  if [ -z "$completions" ]
  then
    _arguments '*::arguments: _normal'
    return
  fi

  # This is not a variable assignment, don't remove spaces!
  _values = "${(ps:\n:)completions}"
}

compdef _dotnet_zsh_complete dotnet

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
# Set personal aliases, overriding those provided by oh-my-zsh libs,
# plugins, and themes. Aliases can be placed here, though oh-my-zsh
# users are encouraged to define aliases within the ZSH_CUSTOM folder.
# For a full list of active aliases, run `alias`.
#
export HISTORY_FILTER_EXCLUDE=("mplayer" "/complete")

# Ensure PATH entries are unique (remove duplicates)
typeset -U PATH path

# Set PATH with ~/.local/bin prioritized
export PATH=~/.local/bin:~/lib/vsts-cli/bin:~/.nvm:~/go/bin:~/.dotnet/tools:$PATH

export EDITOR=nvim
export BROWSER=firefox
export proj=/mnt/c/a/
export LS_COLORS="$LS_COLORS:ow=1;34:tw=1;34:"
export GPG_TTY=$(tty)

if [ -f ~/res/env_vars.sh ]
then
  source ~/res/env_vars.sh
  echo "read ~/res/env_vars.sh"
else
  echo "Create ~/res/env_vars.sh.  There should be an example file in the ~/res folder."
  echo "Type this command into nvim to populate:" 
  echo ":r! cat ~/res/env_vars-example.sh"
fi

export __GL_SHADER_DISK_CACHE_SKIP_CLEANUP=1

# https://www.atlassian.com/git/tutorials/dotfiles
alias config="/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME"

alias l='eza'
alias la='eza -a'
alias ll='eza -lah'
alias ls='eza --color=auto'

alias cat='bat --style=plain'
alias auth='source ~/res/auth.sh'

_dn_select_file() {
  find . -name "$1" | fzf
}

dnrun() {
  local project=$(_dn_select_file "*.csproj")
  [ -n "$project" ] && (unset MSBUILDPROJECTEXTENSIONSPATH; dotnet run --project "$project" -r $DOTNET_RUNTIME_IDENTIFIER)
}

dnrestore() {
  local solution=$(_dn_select_file "*.sln")
  [ -n "$solution" ] && (unset MSBUILDPROJECTEXTENSIONSPATH; dotnet restore "$solution" --interactive -r $DOTNET_RUNTIME_IDENTIFIER)
}

dnbuild() {
  local solution=$(_dn_select_file "*.sln")
  [ -n "$solution" ] && (unset MSBUILDPROJECTEXTENSIONSPATH; dotnet build "$solution" -r $DOTNET_RUNTIME_IDENTIFIER)
}

if [[ $(uname) == 'Darwin' ]]; then
  source ~/.zshrc.mac.zsh
fi

if command -v systemctl > /dev/null; then
  source ~/.zshrc.systemd.zsh
fi

# make this only run in wsl
#. /etc/profile.d/wezterm.sh

eval "$(starship init zsh)"

vv() {
  select config in custom
  do NVIM_APPNAME=nvim-$config nvim $@; break; done
}

export PATH="$HOME/.local/bin:$PATH"
