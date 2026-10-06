#!/bin/zsh
# Shared Bitwarden CLI session cache. Source this, don't execute it.
#
# Every `bw unlock` issues a new session key and invalidates the previous one, so every
# unlock on this machine must go through bw_session_save. Otherwise the cached key goes
# stale and the other unlock path re-prompts (shells vs. SUPER+W's sdlfreerdp.sh used to
# ping-pong like this). Cache lives on tmpfs, so it's once per login. See ~/docs/bitwarden-cli.md.

# Linux: XDG_RUNTIME_DIR (tmpfs, cleared on logout). macOS has no XDG_RUNTIME_DIR, so it falls
# back to the per-user $TMPDIR, which survives logout until reboot/periodic cleanup.
BW_SESSION_CACHE="${XDG_RUNTIME_DIR:-${TMPDIR:-/tmp}}/bw_session"

# Export the cached key. Returns 1 if there is none.
bw_session_load() {
  [[ -s $BW_SESSION_CACHE ]] || return 1
  export BW_SESSION=$(<"$BW_SESSION_CACHE")
}

# Cache and export $1. Refuses an empty key (failed/cancelled unlock).
bw_session_save() {
  [[ -n $1 ]] || return 1
  install -m 600 /dev/null "$BW_SESSION_CACHE"
  printf '%s' "$1" > "$BW_SESSION_CACHE"
  export BW_SESSION=$1
}

# Terminal unlock: bw prompts for the master password on the TTY.
_bw_session_unlock_tty() {
  bw_session_save "$(bw unlock --raw)" || unset BW_SESSION
}

# Before each prompt: pick up a key another shell or sdlfreerdp.sh saved, or, if the
# background check below found this shell's key stale and dropped the cache, re-prompt.
_bw_session_precmd() {
  if [[ -s $BW_SESSION_CACHE ]]; then
    local s=$(<"$BW_SESSION_CACHE")
    [[ $s == "$BW_SESSION" ]] || export BW_SESSION=$s
  elif [[ -n $BW_SESSION ]]; then
    print -P '%F{yellow}Bitwarden session expired, unlocking again%f'
    _bw_session_unlock_tty
  fi
}

# Interactive shell startup. Trusts the cache (no ~0.9s `bw` call on the critical path)
# and validates it in the background instead.
bw_session_shell_init() {
  [[ -o interactive && -t 0 ]] || { bw_session_load; return }
  if bw_session_load; then
    local key=$BW_SESSION
    # Only drop the cache if it still holds the key we checked; a newer save wins.
    # </dev/null is load-bearing: node restores the termios it saw at startup when it
    # exits, which would flip the TTY back to cooked mode under an already-running zle.
    { bw unlock --check --session "$key" </dev/null &>/dev/null ||
        { [[ $(<"$BW_SESSION_CACHE") == "$key" ]] && rm -f "$BW_SESSION_CACHE" } } &!
  else
    _bw_session_unlock_tty
  fi
  autoload -Uz add-zsh-hook
  add-zsh-hook precmd _bw_session_precmd
}
