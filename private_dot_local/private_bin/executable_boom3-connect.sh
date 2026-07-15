#!/bin/bash
MAC=EC:81:93:6A:B7:74
SINK="bluez_output.${MAC//:/_}.1"
VOL_FILE="$HOME/.local/state/boom3-volume"

# Wait for bluetooth adapter to be powered
for i in $(seq 1 30); do
    bluetoothctl show | grep -q "Powered: yes" && break
    sleep 1
done

# Connect if not already connected (ignore exit code — bluetoothctl connect is async)
for i in $(seq 1 7); do
    echo "info $MAC" | bluetoothctl | grep -q "Connected: yes" && break
    bluetoothctl connect "$MAC" || true
    sleep 5
done

# Wait for PipeWire sink to appear
for i in $(seq 1 15); do
    pactl get-sink-volume "$SINK" > /dev/null 2>&1 && break
    sleep 1
done

VOL=$([ -f "$VOL_FILE" ] && cat "$VOL_FILE" || echo "45%")
pactl set-sink-volume "$SINK" "$VOL" || true
