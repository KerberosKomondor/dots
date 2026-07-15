#!/bin/bash
# Watches Hyprland window focus events and bakes any pending clipboard content
# when focus leaves wlfreerdp. See clipboard-bake.sh for the full explanation.

BAKE_PENDING="/tmp/clipboard-bake-pending"
BAKE_STATE="/tmp/cliphist-bake-state"
SOCKET="$XDG_RUNTIME_DIR/hypr/$HYPRLAND_INSTANCE_SIGNATURE/.socket2.sock"

socat -u "UNIX-CONNECT:$SOCKET" STDOUT | while IFS= read -r line; do
    event="${line%%>>*}"
    data="${line#*>>}"

    if [[ "$event" == "activewindow" ]]; then
        wm_class="${data%%,*}"
        if [[ "$wm_class" != *"freerdp"* ]] && [[ -f "$BAKE_PENDING" ]]; then
            pending=$(cat "$BAKE_PENDING")
            rm -f "$BAKE_PENDING"
            if [[ -n "$pending" ]]; then
                # Update the guard so bake.sh doesn't re-trigger on the wl-copy event
                hash=$(printf '%s' "$pending" | sha256sum | cut -c1-16)
                printf '%s:%s' "$hash" "$(date +%s)" > "$BAKE_STATE"
                printf '%s' "$pending" | wl-copy &
                disown
            fi
        fi
    fi
done
