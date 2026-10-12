#!/bin/zsh


source ~/res/bw-session.sh

# Gate on actual vault state, not on whether BW_SESSION happens to be set.
# A stale BW_SESSION inherited from the shell is non-empty but useless: the old
# `[[ -z $BW_SESSION ]]` test passed, zenity never ran, and each `bw get` below
# silently fell back to bw's own TTY "? Master password:" prompt instead.
# Starts from the shared cache (a shell may already have unlocked this login) and
# saves back to it, since unlocking here invalidates every shell's cached key otherwise.
unlock_bw_if_locked() {
  local pw
  bw_session_load
  for i in {1..3}; do
    if bw unlock --check >/dev/null 2>&1; then
      return 0
    fi
    # zenity exits non-zero on Cancel/Esc/window-close. Capture that separately from
    # the password itself: a cancel means "don't connect", not "wrong password", so
    # bail out immediately instead of burning the remaining retries.
    if ! pw="$(zenity --password 2>/dev/null)"; then
      exit 0
    fi
    if ! bw_session_save "$(bw unlock "$pw" --raw)"; then
      notify-send "Incorrect password. Attempt $i of 3"
    fi
  done
  notify-send --urgency=critical "Failed to unlock after 3 attempts"
  exit 1
}

bw_get() {
  local field=${1:?"field required"} item=${2:?"item required"} value
  value="$(bw get "$field" "$item" </dev/null 2>/dev/null)"
  if [[ -z $value ]]; then
    notify-send --urgency=critical "bw get $field failed (vault locked or item missing)"
    return 1
  fi
  printf '%s' "$value"
}

# Connect once with the given password. Returns sdl-freerdp3's exit code.
#
# sdl-freerdp3 instead of xfreerdp3 — native Wayland client (SDL3 video driver),
# clipboard goes through wl_data_device instead of X11 CLIPBOARD selection,
# sidesteps the CJK-garble bug in ~/docs/clipboard.md (confirmed working better).
# -grab-keyboard: keys stay with Hyprland (Super, workspace switch, etc still
# work) instead of all keys forwarding raw to the remote session. RShift+G
# toggles full grab on/off live if a raw combo (e.g. remote Alt+Tab) is needed.
rdp_connect() {
  local ip_addr=$1 username=$2 password=$3
  sdl-freerdp3 /v:"$ip_addr" \
    /bpp:32 \
    /u:"$username" \
    /p:"$password" \
    /cert:ignore \
    /sec:tls \
    /w:1920 \
    /h:1080 \
    /d: \
    /kbd:remap:58=29 \
    /kbd:remap:326=111 \
    +clipboard \
    -grab-keyboard \
    /mouse:grab:off \
    /wm-class:sdl-freerdp \
    /gfx:AVC420
}

main() {
  unlock_bw_if_locked

  local bw_id="f454103e-c244-452c-89f7-b1a80036ee46"

  # </dev/null denies bw a TTY so it can't silently hijack the terminal with its own
  # "? Master password:" prompt when the session is bad. But bw then exits 0 with EMPTY
  # stdout on that EOF, so `|| exit 1` is not enough — check the value, not the status.
  local password username ip_addr
  password="$(bw_get password okta.com)"  || exit 1
  username="$(bw_get username "$bw_id")"  || exit 1
  ip_addr="$(bw_get uri "$bw_id")"        || exit 1

  local ret_value
  rdp_connect "$ip_addr" "$username" "$password"
  ret_value=$?

  # 131 is sdl-freerdp3's generic connect failure, which is what a rejected password
  # looks like under /sec:tls. Resending the same vault password can't succeed and only
  # burns logon attempts, so ask for one instead. Any other code (clean exit, user
  # disconnect) is final. Cancelling the dialog means "don't connect".
  for i in {1..3}; do
    [[ $ret_value -eq 131 ]] || break
    if ! password="$(zenity --password --title="RDP password (attempt $i of 3)" 2>/dev/null)"; then
      exit 0
    fi
    rdp_connect "$ip_addr" "$username" "$password"
    ret_value=$?
  done

  exit $ret_value
}

main "$@"
