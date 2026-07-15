#!/bin/bash
# Auto-restart AGS when source files change.
# Usage: ~/.config/ags/watch.sh

AGS_DIR="$HOME/.config/ags"
LAST_RESTART=0

log() { echo "[watch] $*"; }

restart() {
    local now
    now=$(date +%s%3N)  # ms since epoch
    # Debounce: ignore if last restart was < 500ms ago
    if (( now - LAST_RESTART < 500 )); then
        log "debounce, skipping"
        return
    fi
    LAST_RESTART=$now

    log "restarting AGS..."
    ags quit 2>/dev/null || true
    sleep 0.5
    ags run "$AGS_DIR" &>/tmp/ags-watch.log &
    log "started (pid $!)"
}

log "watching $AGS_DIR"
restart

while read -r dir event file; do
    log "detected: $dir$file ($event)"
    restart
done < <(inotifywait -m -r \
    -e modify,close_write,create,delete,moved_to \
    --include '.*\.(tsx?|scss)$' \
    "$AGS_DIR" 2>/dev/null)

log "inotifywait exited, stopping"
