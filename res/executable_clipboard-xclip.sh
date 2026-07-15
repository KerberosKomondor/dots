#!/bin/bash
# Wrapper for wl-paste --watch: pipes content to xclip only when active window
# is NOT xfreerdp. This prevents xfreerdp from losing X11 clipboard ownership,
# which would trigger a CLIPRDR re-announcement and cause xfreerdp to send raw
# UTF-8 bytes as CF_UNICODETEXT (producing CJK chars on paste in Windows).
#
# When focus is freerdp: xclip is skipped; xfreerdp keeps X11 ownership.
# When focus leaves freerdp: bake-watcher fires wl-copy → wl-paste re-triggers
# this script with non-freerdp focus → xclip runs → Teams/local apps can read.

data=$(cat)
active_class=$(hyprctl -j activewindow 2>/dev/null | jq -r '.class // ""' 2>/dev/null)
if [[ "$active_class" != *"freerdp"* ]]; then
    printf '%s' "$data" | xclip -selection clipboard
fi
