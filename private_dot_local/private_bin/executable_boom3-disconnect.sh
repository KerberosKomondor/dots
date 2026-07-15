#!/bin/bash
MAC=EC:81:93:6A:B7:74
VOL_FILE="$HOME/.local/state/boom3-volume"

VOL=$(pactl get-sink-volume "bluez_output.${MAC//:/_}.1" 2>/dev/null \
    | grep -oP '\d+(?=%)' | head -1)
[ -n "$VOL" ] && echo "${VOL}%" > "$VOL_FILE"

timeout 3 bluetoothctl disconnect "$MAC" || true
