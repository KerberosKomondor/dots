#!/bin/bash
# Stores clipboard text in cliphist and takes local Wayland ownership,
# preventing the xfreerdp → Electron (Teams) clipboard deadlock where
# Teams hangs trying to fetch data through the RDP pipe.
#
# When the clipboard change came from wlfreerdp (user copied in RDP), we
# defer wl-copy until focus leaves the RDP window. This prevents xfreerdp
# from re-announcing the clipboard to Windows (which triggers an encoding
# corruption bug producing CJK chars on paste within the RDP session).
# The clipboard-bake-watcher.sh script handles the deferred bake.
#
# Guard: hash+timestamp stops the watcher from re-triggering itself
# when wl-copy takes ownership and fires a new clipboard event.
BAKE_STATE="/tmp/cliphist-bake-state"
BAKE_PENDING="/tmp/clipboard-bake-pending"
TRACE="/tmp/clipboard-trace.log"
trace() { printf '%s bake.sh: %s\n' "$(date +%s.%N)" "$1" >> "$TRACE"; }

trace "start"
data=$(timeout 3 cat)
trace "got data (${#data} bytes)"
[ -z "$data" ] && { trace "empty, exit"; exit 0; }

printf '%s' "$data" | cliphist store
trace "cliphist stored"

hash=$(printf '%s' "$data" | sha256sum | cut -c1-16)
last_info=$(cat "$BAKE_STATE" 2>/dev/null)
last_hash=${last_info%%:*}
last_time=${last_info#*:}
now=$(date +%s)

# Bake if content changed, or if same content but >2s have passed
# (handles re-copying same text from xfreerdp after a paste)
if [ "$hash" != "$last_hash" ] || [ -z "$last_time" ] || [ $((now - last_time)) -gt 2 ]; then
    printf '%s:%s' "$hash" "$now" > "$BAKE_STATE"

    trace "checking active window"
    active_class=$(hyprctl -j activewindow 2>/dev/null | jq -r '.class // ""' 2>/dev/null)
    trace "active_class=$active_class"

    if [[ "$active_class" == *"freerdp"* ]]; then
        # Defer: let the focus watcher bake this when RDP loses focus
        printf '%s' "$data" > "$BAKE_PENDING"
        trace "deferred to BAKE_PENDING"
    else
        rm -f "$BAKE_PENDING"
        trace "baking immediately via wl-copy"
        printf '%s' "$data" | wl-copy &
        disown
        trace "wl-copy launched, pid=$!"
    fi
else
    trace "skipped (dedup guard)"
fi
trace "end"
