-- Hyprland Lua config — converted from hyprland.conf
-- Use WinKey for both WM cmds and app launches

local mod      = "SUPER"
local execMod  = "SUPER"
local term     = "kitty"
local browser  = "firefox"
local lockCmd  = "hyprlock"
local explorer = "thunar"

-- ── Monitors ─────────────────────────────────────────────────────────────────
hl.monitor({ output = "DP-1", mode = "1920x1080@240", position = "0x0",    scale = "1" })
hl.monitor({ output = "DP-2", mode = "1920x1080@144", position = "1920x0", scale = "1" })

-- ── XWayland ─────────────────────────────────────────────────────────────────
hl.config({
    xwayland = {
        enabled = true,
    },
})

-- ── Input ─────────────────────────────────────────────────────────────────────
hl.config({
    input = {
        kb_options   = "ctrl:nocaps",
        follow_mouse = 1,
    },
})

-- ── General ───────────────────────────────────────────────────────────────────
hl.config({
    general = {
        gaps_in     = 4,
        gaps_out    = 8,
        border_size = 2,
        col = {
            active_border   = "rgb(8be9fd)",
            inactive_border = "rgb(44475a)",
        },
        layout = "dwindle",
    },
})

-- ── Decoration ────────────────────────────────────────────────────────────────
hl.config({
    decoration = {
        rounding = 4,
        blur = {
            enabled = true,
            size    = 3,
            passes  = 1,
        },
        shadow = {
            enabled = false,
        },
    },
})

-- ── Animations ────────────────────────────────────────────────────────────────
hl.config({ animations = { enabled = true } })
hl.animation({ leaf = "windows",    enabled = true, speed = 3, bezier = "default" })
hl.animation({ leaf = "workspaces", enabled = true, speed = 4, bezier = "default", style = "slide" })

-- ── Layout ────────────────────────────────────────────────────────────────────
hl.config({
    dwindle = {
        preserve_split = true,
    },
})

-- ── Workspace names ───────────────────────────────────────────────────────────
-- Note: workspace naming via hl.workspace_rule is not supported in 0.55 Lua API

-- ── Persistent workspaces ─────────────────────────────────────────────────────
-- Keep 1-4 always present (shown in AGS Bar/Workspaces) even with no windows open
hl.workspace_rule({ workspace = "1", persistent = true })
hl.workspace_rule({ workspace = "2", persistent = true })
hl.workspace_rule({ workspace = "3", persistent = true })
hl.workspace_rule({ workspace = "4", persistent = true })

-- ── Autostart ─────────────────────────────────────────────────────────────────
hl.on("hyprland.start", function()
    hl.exec_cmd("systemctl --user import-environment DISPLAY WAYLAND_DISPLAY HYPRLAND_INSTANCE_SIGNATURE XDG_CURRENT_DESKTOP XDG_SESSION_TYPE")
    hl.exec_cmd("dbus-update-activation-environment --systemd WAYLAND_DISPLAY XDG_CURRENT_DESKTOP=Hyprland")
    hl.exec_cmd("systemctl --user start xdg-desktop-portal-hyprland xdg-desktop-portal")
    hl.exec_cmd("systemctl --user start hyprland-session.target")
    hl.exec_cmd("hyprpaper")
    hl.exec_cmd("hypridle")
    hl.exec_cmd("nm-applet --indicator")
    hl.exec_cmd("/home/appa/res/bt-volume-fix.sh")
    hl.exec_cmd("solaar")
    hl.exec_cmd("blueman-applet")
    hl.exec_cmd("ags run /home/appa/.config/ags/app.ts")
    hl.exec_cmd("pasystray")
    hl.exec_cmd("udiskie")
    hl.exec_cmd("wl-clip-persist --clipboard both")
    hl.exec_cmd("wl-paste --watch /home/appa/res/clipboard-xclip.sh")
    hl.exec_cmd("wl-paste --type text --watch /home/appa/res/clipboard-bake.sh")
    hl.exec_cmd("/home/appa/res/clipboard-bake-watcher.sh")
    hl.exec_cmd("wl-paste --type image --watch cliphist store")
    hl.exec_cmd("dex --autostart --environment Hyprland")
    hl.exec_cmd("/home/appa/.local/bin/dictate-daemon")
    hl.exec_cmd("/home/appa/res/teams-tile.sh")
end)

-- ── Layer rules ───────────────────────────────────────────────────────────────
-- Disable blur on AGS bar/popups (gtk-layer-shell namespace) so text renders crisp
hl.layer_rule({ match = { namespace = "gtk-layer-shell" }, blur = false })

-- ── Window rules ──────────────────────────────────────────────────────────────
hl.window_rule({
    name        = "firefox",
    match       = { class = "^(firefox|org\\.mozilla\\.firefox)$" },
    workspace   = "1",
    border_size = 0,
})

hl.window_rule({
    name           = "teams",
    match          = { title = "^Microsoft Teams" },
    workspace      = "3",
    border_size    = 0,
    tile           = true,
    suppress_event = "maximize fullscreen",
})

hl.window_rule({
    name        = "freerdp",
    match       = { class = "^(xfreerdp|wlfreerdp|sdl-freerdp)$" },
    workspace   = "4",
    border_size = 0,
    decorate    = false,
})

hl.window_rule({
    name        = "kitty",
    match       = { class = "^kitty$" },
    border_size = 2,
})

hl.window_rule({
    name        = "overwatch",
    match       = { class = "^steam_app_2357570$" },
    border_size = 0,
    monitor     = "DP-1",
})

-- Stop hypridle/lock kicking in on fullscreen video (youtube, mpv, etc)
hl.window_rule({
    name         = "idle-inhibit-fullscreen",
    match        = { class = ".*" },
    idle_inhibit = "fullscreen",
})

-- ── Keybindings ───────────────────────────────────────────────────────────────

-- Terminal
hl.bind(mod .. " + Return", hl.dsp.exec_cmd(term))

-- Kill focused window
hl.bind(mod .. " + SHIFT + Q", hl.dsp.window.close())

-- App launcher
hl.bind(mod .. " + D", hl.dsp.exec_cmd("rofi -show drun"))

-- Focus movement
hl.bind(mod .. " + left",  hl.dsp.focus({ direction = "left"  }))
hl.bind(mod .. " + H",     hl.dsp.focus({ direction = "left"  }))
hl.bind(mod .. " + down",  hl.dsp.focus({ direction = "down"  }))
hl.bind(mod .. " + J",     hl.dsp.focus({ direction = "down"  }))
hl.bind(mod .. " + up",    hl.dsp.focus({ direction = "up"    }))
hl.bind(mod .. " + K",     hl.dsp.focus({ direction = "up"    }))
hl.bind(mod .. " + right", hl.dsp.focus({ direction = "right" }))
hl.bind(mod .. " + L",     hl.dsp.focus({ direction = "right" }))

-- Move window
hl.bind(mod .. " + SHIFT + left",  hl.dsp.window.move({ direction = "left"  }))
hl.bind(mod .. " + SHIFT + H",     hl.dsp.window.move({ direction = "left"  }))
hl.bind(mod .. " + SHIFT + down",  hl.dsp.window.move({ direction = "down"  }))
hl.bind(mod .. " + SHIFT + J",     hl.dsp.window.move({ direction = "down"  }))
hl.bind(mod .. " + SHIFT + up",    hl.dsp.window.move({ direction = "up"    }))
hl.bind(mod .. " + SHIFT + K",     hl.dsp.window.move({ direction = "up"    }))
hl.bind(mod .. " + SHIFT + right", hl.dsp.window.move({ direction = "right" }))
hl.bind(mod .. " + SHIFT + L",     hl.dsp.window.move({ direction = "right" }))

-- Split orientation (dwindle preselect direction)
hl.bind(mod .. " + backslash", hl.dsp.layout("preselect r"))
hl.bind(mod .. " + minus",     hl.dsp.layout("preselect d"))

-- Resize active window (repeating)
hl.bind(mod .. " + CTRL + right", hl.dsp.window.resize({ x = 50,  y = 0   }), { repeating = true })
hl.bind(mod .. " + CTRL + left",  hl.dsp.window.resize({ x = -50, y = 0   }), { repeating = true })
hl.bind(mod .. " + CTRL + up",    hl.dsp.window.resize({ x = 0,   y = -50 }), { repeating = true })
hl.bind(mod .. " + CTRL + down",  hl.dsp.window.resize({ x = 0,   y = 50  }), { repeating = true })
hl.bind(mod .. " + CTRL + L",     hl.dsp.window.resize({ x = 50,  y = 0   }), { repeating = true })
hl.bind(mod .. " + CTRL + H",     hl.dsp.window.resize({ x = -50, y = 0   }), { repeating = true })
hl.bind(mod .. " + CTRL + K",     hl.dsp.window.resize({ x = 0,   y = -50 }), { repeating = true })
hl.bind(mod .. " + CTRL + J",     hl.dsp.window.resize({ x = 0,   y = 50  }), { repeating = true })

-- Fullscreen
hl.bind(mod .. " + F", hl.dsp.window.fullscreen(0))

-- Layout toggle
hl.bind(mod .. " + S", hl.dsp.layout("togglesplit"))

-- Toggle floating
hl.bind(mod .. " + SHIFT + space", hl.dsp.window.float({ action = "toggle" }))
hl.bind(mod .. " + space",         hl.dsp.window.float({ action = "toggle" }))

-- Focus master
hl.bind(mod .. " + A", hl.dsp.layout("focusmaster"))

-- Workspace switching and window moves (key 0 = workspace 10)
for i = 1, 10 do
    local key = i % 10
    hl.bind(mod .. " + " .. key,         hl.dsp.focus({ workspace = i }))
    hl.bind(mod .. " + SHIFT + " .. key, hl.dsp.window.move({ workspace = i }))
end

-- Move current workspace to a specific monitor
hl.bind(mod .. " + CTRL + period", hl.dsp.workspace.move({ monitor = "DP-2" }))
hl.bind(mod .. " + CTRL + comma",  hl.dsp.workspace.move({ monitor = "DP-1" }))

-- Reload / exit
hl.bind(mod .. " + SHIFT + C", hl.dsp.exec_cmd("hyprctl reload"))
hl.bind(mod .. " + SHIFT + E", hl.dsp.exec_cmd('rofi -show p -modi "p:rofi-power-menu --no-symbols" || hyprctl dispatch exit'))

-- Note: hl.submap / hl.dsp.submap not available in 0.55 Lua API
-- Resize submap removed; use MOD+CTRL+arrows above instead

-- Lock
hl.bind(mod .. " + CTRL + L", hl.dsp.exec_cmd(lockCmd))

-- App launches
hl.bind(execMod .. " + B", hl.dsp.exec_cmd(browser))
hl.bind(execMod .. " + SHIFT + E", hl.dsp.exec_cmd(explorer))
hl.bind(execMod .. " + W", hl.dsp.exec_cmd("~/res/xfreerdp.sh"))
hl.bind(execMod .. " + T", hl.dsp.exec_cmd("dex ~/.local/share/applications/teams.desktop"))

-- Screenshot
hl.bind(execMod .. " + X", hl.dsp.exec_cmd("hyprshot --mode region"))

-- Clipboard history
hl.bind(execMod .. " + V", hl.dsp.exec_cmd('cliphist list | rofi -dmenu -p "clipboard" | cliphist decode | wl-copy'))
-- Restore previous clipboard (recovers local copy after RDP steals focus and overwrites it)
hl.bind(execMod .. " + SHIFT + V", hl.dsp.exec_cmd("cliphist list | sed -n '2p' | cliphist decode | wl-copy"))

-- Volume controls
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd("pactl set-sink-volume @DEFAULT_SINK@ +10%"))
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd("pactl set-sink-volume @DEFAULT_SINK@ -10%"))
hl.bind("XF86AudioMute",        hl.dsp.exec_cmd("pactl set-sink-mute @DEFAULT_SINK@ toggle"))
hl.bind("XF86AudioMicMute",     hl.dsp.exec_cmd("pactl set-source-mute @DEFAULT_SOURCE@ toggle"))

-- Hold-to-talk dictation (Pause = start, release = transcribe)
hl.bind("Pause", hl.dsp.exec_cmd("pkill -USR1 -f dictate-daemon"))
hl.bind("Pause", hl.dsp.exec_cmd("pkill -USR2 -f dictate-daemon"), { release = true })

-- Mouse drag/resize floating windows
hl.bind(mod .. " + mouse:272", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })
