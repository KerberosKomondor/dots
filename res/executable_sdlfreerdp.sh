#!/bin/zsh


# Gate on actual vault state, not on whether BW_SESSION happens to be set.
# A stale BW_SESSION inherited from the shell is non-empty but useless: the old
# `[[ -z $BW_SESSION ]]` test passed, zenity never ran, and each `bw get` below
# silently fell back to bw's own TTY "? Master password:" prompt instead.
unlock_bw_if_locked() {
  for i in {1..3}; do
    if bw unlock --check >/dev/null 2>&1; then
      return 0
    fi
    export BW_SESSION="$(bw unlock "$(zenity --password 2>/dev/null)" --raw)"
    if [[ -z $BW_SESSION ]]; then
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

try_command() {
  readonly cmd=${1:?"the command must be specified"}
  readonly retries=3
  readonly wait_retry=3

  for i in `seq 1 $retries`; do
    eval "$cmd"
    ret_value=$?

    # Exit code 0 means success
    [ $ret_value -eq 0 ] && exit 0

    # Exit code 131 typically indicates authentication/connection failure - retry these
    # Other exit codes (like user disconnect) should not trigger retry
    if [ $ret_value -eq 131 ]; then
      echo "> Authentication or connection failed (code $ret_value), waiting to retry..."
      sleep $wait_retry
    else
      echo "> Exited with code $ret_value (not retrying)"
      exit $ret_value
    fi
  done

  exit $ret_value
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

  # sdl-freerdp3 instead of xfreerdp3 — native Wayland client (SDL3 video driver),
  # clipboard goes through wl_data_device instead of X11 CLIPBOARD selection,
  # sidesteps the CJK-garble bug in ~/docs/clipboard.md (confirmed working better).
  # -grab-keyboard: keys stay with Hyprland (Super, workspace switch, etc still
  # work) instead of all keys forwarding raw to the remote session. RShift+G
  # toggles full grab on/off live if a raw combo (e.g. remote Alt+Tab) is needed.
  command="sdl-freerdp3 /v:$(printf '%q' "$ip_addr") \
    /bpp:32 \
    /u:$(printf '%q' "$username") \
    /p:$(printf '%q' "$password") \
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
    /gfx:AVC420"

  try_command "$command"
}

main "$@"
