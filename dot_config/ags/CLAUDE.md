# AGS Config — Developer Notes

AGS 3.1.2 with gnim reactive library. TypeScript/TSX targeting GTK4.

## Run / restart

```bash
ags quit && ags run ~/.config/ags
```

Auto-restart on file changes (eliminates manual restarts during dev):
```bash
~/.config/ags/watch.sh
```

Compile-check without running:
```bash
ags bundle ~/.config/ags/app.ts /tmp/check.js
```

## File map

| File | Responsibility |
|------|----------------|
| `app.ts` | Entry point, global state (`todoVisible`, `dashboardVisible`, `weatherVisible`, `volumeVisible`), popup instantiation |
| `style.scss` | All styles — Dracula theme throughout |
| `service/weather.ts` | Weather polling, Open-Meteo API |
| `service/todos.ts` | Todo file I/O, badge count state |
| `service/audio.ts` | AstalWp reactive wrapper — speaker/mic/stream lists, default-device volume & mute |
| `widget/Bar.tsx` | Bar window, left/right clusters |
| `widget/TodoPopup.tsx` | Todo popup — day tabs, item list, add flow |
| `widget/Dashboard.tsx` | Dashboard popup — power, toggles |
| `widget/VolumePopup.tsx` | Volume mixer popup — master volume + Output/Apps/Input tabs |

## Multi-monitor

`app.get_monitors()` returns all `Gdk.Monitor` instances. To target a specific output:

- **Do NOT use `get_connector()`** — not exposed in this GJS binding (throws `TypeError: not a function`)
- **Do NOT use `is_primary()`** — always returns false on Wayland/Hyprland
- **Use geometry**: filter by `m.get_geometry().x` based on Hyprland monitor positions

DP-1 (left, x=0) vs DP-2 (right, x=1920):
```typescript
monitors.filter(m => m.get_geometry().x > 0).map(Bar)  // DP-2 only
```

All AGS windows (Bar, Dashboard, Weather/Todo/Calendar/Volume popups, NotificationPopups, NotificationHistory) intentionally live on DP-2 (right), even though DP-1 (left) is Hyprland's "primary" — AGS placement is user preference, not tied to primary. Don't assume `monitors[0]` is the right monitor — resolve it by geometry (`app.ts` does this via `rightMonitor`).

## Reactive primitives (gnim)

```typescript
import { createState, With, createBinding } from "ags"
import { interval } from "ags/time"

// Local state
const [value, setValue] = createState(0)
value()           // read
setValue(1)       // write
value.as(n => n * 2)  // derived binding (use on JSX props directly)

// GObject property binding
const binding = createBinding(gobject, "property")

// Reactive child rendering
<With value={signal}>{(val) => <label label={String(val)} />}</With>

// Polling
interval(5000, callback)  // every 5s, no immediate call
```

**Use `.as()` on props directly instead of `<With>` when you don't need conditional rendering** — it's simpler and avoids a Fragment wrapper.

## GTK4 layout notes

### Overlay JSX

GTK4 `Gtk.Overlay` has no `overlays` prop. Use `$type="overlay"` on JSX children to route them through GTK's buildable API (`vfunc_add_child` with type `"overlay"` calls `add_overlay`). First child without `$type` becomes the base widget.

```tsx
<overlay>
  <button>base widget</button>
  <label
    $type="overlay"
    halign={Gtk.Align.END}
    valign={Gtk.Align.START}
    label={count.as(n => String(n))}
  />
</overlay>
```

Reactive `.as()` bindings on overlay child **props** are fine — they're on the widget itself, not in an array.

### tsconfig jsxImportSource

Must be `"ags/gtk4"` — if set to `"ags/gtk3"` the bundler includes the GTK3 jsx-runtime and GJS throws `Version 4.0 of GI module Gtk already loaded, cannot load version 3.0` at startup.

## Popup pattern

All popups (Dashboard, WeatherPopup, TodoPopup) follow the same pattern:

```typescript
// app.ts
export const [fooVisible, setFooVisible] = createState(false)

// FooPopup.tsx
<window
  layer={Astal.Layer.OVERLAY}
  keymode={Astal.Keymode.ON_DEMAND}
  anchor={TOP | LEFT}
  visible={fooVisible.as(v => v)}
  onKeyPressEvent={(_self, event) => {
    if (event.get_keyval()[1] === Gdk.KEY_Escape) setFooVisible(false)
  }}
>
```

Use `visible={signal.as(v => v)}` — not `visible={signal as unknown as boolean}` (the `.as()` form is type-safe).

## File I/O (Gio/GLib)

```typescript
import Gio from "gi://Gio"
import GLib from "gi://GLib"

function readFileSync(path: string): string | null {
  try {
    const file = Gio.File.new_for_path(path)
    const [ok, contents] = file.load_contents(null)
    if (!ok || !contents) return null
    return new TextDecoder().decode(contents as Uint8Array)
  } catch { return null }
}

function writeFileSync(path: string, content: string): void {
  try {
    const file = Gio.File.new_for_path(path)
    const parent = file.get_parent()
    if (parent) try { parent.make_directory_with_parents(null) } catch (_) {}
    file.replace_contents(
      new TextEncoder().encode(content),
      null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null
    )
  } catch (e) { console.error("writeFileSync:", e) }
}
```

**Always use local date methods** (`getFullYear`/`getMonth`/`getDate`) — `toISOString()` returns UTC and is wrong for 6-7h after midnight in Colorado (UTC-6/7).

## Dotfiles

Use `config` (bare git repo alias), not `git`:
```bash
config add ~/.config/ags/widget/Foo.tsx
config commit -m "feat(ags): ..."
```
