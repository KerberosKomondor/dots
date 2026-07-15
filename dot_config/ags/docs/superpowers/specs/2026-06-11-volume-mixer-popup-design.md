# Volume Mixer Popup — Design

## Goal

Replace the no-op click on the bar's `Volume` widget with a popup mixer
(master volume, output device picker, per-app volume, microphone/input
controls), following the existing popup pattern (`CalendarPopup`,
`WeatherPopup`).

## Scope

- Master speaker volume slider + mute toggle (always visible)
- Tabbed lower section: **Output** / **Apps** / **Input**
  - Output: list of speaker devices, click to set as default
  - Apps: per-application playback volume sliders + mute
  - Input: microphone volume slider + mute, plus list of input devices
- Bar widget keeps its existing scroll-to-adjust behavior; click now also
  opens/closes the popup
- Popup remembers which tab was last active across open/close (component
  state persists since it's instantiated once at startup)

Out of scope: per-app recording streams (mic-using apps), output volume
>100% boost UI (slider stays 0–1 like the existing bar widget).

## Architecture

```
service/audio.ts      (new)  reactive WirePlumber state
widget/VolumePopup.tsx (new) popup window + tabs
widget/Volume.tsx      (edit) add click → toggle popup
app.ts                 (edit) volumeVisible state, register popup
style.scss             (edit) .volume-popup styles
```

### `service/audio.ts`

Centralizes WirePlumber (`AstalWp`) reactive state so the popup component
stays focused on rendering.

```ts
import Wp from "gi://AstalWp"
import { createState, createBinding } from "ags"

const audio = Wp.get_default()!.audio

export const [speakers, setSpeakers] = createState(audio.get_speakers() ?? [])
export const [microphones, setMicrophones] = createState(audio.get_microphones() ?? [])
export const [streams, setStreams] = createState(audio.get_streams() ?? [])

audio.connect("speaker-added", (_a, e) => setSpeakers(s => [...s, e]))
audio.connect("speaker-removed", (_a, e) => setSpeakers(s => s.filter(x => x.id !== e.id)))
audio.connect("microphone-added", (_a, e) => setMicrophones(s => [...s, e]))
audio.connect("microphone-removed", (_a, e) => setMicrophones(s => s.filter(x => x.id !== e.id)))
audio.connect("stream-added", (_a, e) => setStreams(s => [...s, e]))
audio.connect("stream-removed", (_a, e) => setStreams(s => s.filter(x => x.id !== e.id)))

export const defaultSpeaker = createBinding(audio, "default-speaker")
export const defaultMicrophone = createBinding(audio, "default-microphone")
```

Per-row reactive bindings (Endpoint/Stream extend `Node`, which has
`volume`, `mute`, `name`, `description`, `icon`, `id`):

- volume slider: `value={createBinding(node, "volume")}`, write back on
  slider `value-changed` → `node.volume = clamp(0, 1, v)`
- mute icon: `createBinding(node, "mute")`, click → `node.mute = !node.mute`
- icon: `<image icon-name={node.icon}/>` — `Node.icon` resolves to the
  app's actual icon name (e.g. `spotify`, `firefox`), falling back to
  `audio-card-symbolic`
- device row active state: `createBinding(endpoint, "is-default")` for
  highlight class; click → `endpoint.set_is_default(true)`

If `audio.get_default_speaker()` is null (no audio device at all), the
popup shows an empty state instead of rendering controls — mirrors
`Volume.tsx`'s existing `if (!speaker) return ...🔇` guard.

### `widget/VolumePopup.tsx`

Follows `CalendarPopup` pattern: `Astal.Layer.OVERLAY`, `anchor={TOP|RIGHT}`,
click-outside or Esc closes via the same gesture/key-controller approach.

```
window
  box (halign END, valign START, class "volume-popup")
    [Master row]   speaker icon (click=mute) | slider (defaultSpeaker.volume) | "NN%"
    [Tab bar]      togglebuttons: Output | Apps | Input — active tab highlighted
    [Stack]        switches between 3 boxes by active tab index
       Output tab → For(speakers): icon + name row, highlight if is-default,
                     click → set_is_default(true)
       Apps tab   → For(streams): app icon (stream.icon) + name (description)
                     + slider (volume) + mute-on-click icon
                     empty state: "No apps playing audio" when streams.length === 0
       Input tab  → mic row (icon click=mute + slider for defaultMicrophone.volume),
                     divider, For(microphones) device list (same as Output)
```

Tab state: local `createState(0)` inside `VolumePopup()`. Since the
component is instantiated once in `app.ts`'s `main()` and the window only
toggles `visible`, this state persists naturally — satisfying "remember
last tab" without extra persistence logic.

### `widget/Volume.tsx`

Add a click handler (via `Gtk.GestureClick` alongside the existing
`Gtk.EventControllerScroll`, or swap the outer `<box>` for a `<button>`)
that calls `togglePopup(volumeVisible, setVolumeVisible)`. Scroll-to-adjust
behavior is unchanged.

### `app.ts`

```ts
export const [volumeVisible, setVolumeVisible] = createState(false)
// closeAllPopups(): add setVolumeVisible(false)
// main(): add VolumePopup(monitors[0])
```

### `style.scss`

New `.volume-popup` block following `WeatherPopup`/`CalendarPopup`
conventions:

- Container: `background: #282a36; border: 1px solid #44475a; border-radius: 10px; padding: 16px;`
- Tab buttons: inactive `#44475a`, active `#bd93f9` with dark text (matches
  `.calendar-day.today` / tray-menu active styling)
- Slider track `#44475a`, fill `#bd93f9`

## Testing Plan

1. `ags bundle ~/.config/ags/app.ts /tmp/check.js` — compile check
2. `~/.config/ags/watch.sh` for live reload
3. Click volume bar widget → popup opens on remembered tab
4. Master slider + mute (click icon) work and reflect real volume
   (cross-check with `wpctl status` / `wpctl get-volume @DEFAULT_AUDIO_SINK@`)
5. Output tab: switch default speaker, confirm via `wpctl status`
6. Apps tab: play audio (e.g. `mpv`), confirm stream appears live with
   working slider/mute; confirm "No apps playing audio" when nothing plays
7. Input tab: mic slider/mute + device switch
8. Click-outside and Esc close the popup
9. Scroll on bar widget still adjusts master volume
