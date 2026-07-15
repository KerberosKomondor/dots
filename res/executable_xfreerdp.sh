#!/bin/zsh


exit_if_master_password_error() {
  if [[ -z $BW_SESSION ]]; then
    notify-send --wait --urgency=critical "master password was incorrect"
    exit 1
  fi
}

unlock_bw_if_locked() {
  for i in {1..3}; do
    if [[ -z $BW_SESSION ]]; then
      export BW_SESSION="$(bw unlock "$(zenity --password)" --raw)"
      if [[ -n $BW_SESSION ]]; then
        return 0
      fi
      notify-send "Incorrect password. Attempt $i of 3"
    else
      return 0
    fi
  done
  notify-send --urgency=critical "Failed to unlock after 3 attempts"
  exit 1
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
  exit_if_master_password_error

  local bw_id="f454103e-c244-452c-89f7-b1a80036ee46"

  local password="$(bw get password okta.com)" || exit 1
  local username="$(bw get username $bw_id)"
  local ip_addr="$(bw get uri $bw_id)"

  command="xfreerdp3 /v:$(printf '%q' "$ip_addr") \
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
    +grab-keyboard \
    /mouse:grab:off \
    /wm-class:wlfreerdp \
    /gfx:AVC420"

  try_command "$command"
}

main "$@"
