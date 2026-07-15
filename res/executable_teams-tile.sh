#!/usr/bin/env python3
# Watch for Teams window and force-tile it (Chrome XWayland sets PPosition which causes floating)
import os, socket, subprocess, time

sock_path = f"{os.environ['XDG_RUNTIME_DIR']}/hypr/{os.environ['HYPRLAND_INSTANCE_SIGNATURE']}/.socket2.sock"

with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as s:
    s.connect(sock_path)
    buf = b""
    while True:
        data = s.recv(4096)
        if not data:
            break
        buf += data
        while b"\n" in buf:
            line, buf = buf.split(b"\n", 1)
            event = line.decode("utf-8", errors="replace")
            if event.startswith("openwindow>>"):
                parts = event[len("openwindow>>"):].split(",", 3)
                if len(parts) >= 4:
                    cls, title = parts[2], parts[3]
                    if cls == "Google-chrome" and "Microsoft Teams" in title:
                        time.sleep(0.5)
                        subprocess.run(["hyprctl", "dispatch", "settiled", "title:^Microsoft Teams"])
