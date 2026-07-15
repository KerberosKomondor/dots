#!/bin/bash
# Set BOOM 3 volume to 45% whenever it connects (not on other sink events)

BOOM_MAC="EC_81_93_6A_B7_74"

get_boom_sink() {
    pactl list sinks short | awk "/$BOOM_MAC/{print \$2}"
}

# Handle case where BOOM is already connected on startup
sleep 2
initial_sink=$(get_boom_sink)
[ -n "$initial_sink" ] && pactl set-sink-volume "$initial_sink" 45%

boom_present=$([ -n "$initial_sink" ] && echo 1 || echo 0)

# Only reset volume when BOOM transitions from absent -> present (actual BT connect)
while IFS= read -r event; do
    if [[ "$event" == *"Event 'new' on sink"* ]] || [[ "$event" == *"Event 'remove' on sink"* ]]; then
        sleep 0.3
        boom_sink=$(get_boom_sink)
        if [ -n "$boom_sink" ] && [ "$boom_present" = "0" ]; then
            pactl set-sink-volume "$boom_sink" 45%
        fi
        boom_present=$([ -n "$boom_sink" ] && echo 1 || echo 0)
    fi
done < <(pactl subscribe 2>/dev/null)
