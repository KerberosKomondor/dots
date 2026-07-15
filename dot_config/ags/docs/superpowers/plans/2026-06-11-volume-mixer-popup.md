# Volume Mixer Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a click-triggered volume mixer popup (master volume, output device picker, per-app volume, mic/input controls) to the AGS bar, replacing the current no-op click on the `Volume` widget.

**Architecture:** A new `service/audio.ts` module wraps `AstalWp` in reactive `createState`/`Accessor` exports (speaker/mic/stream lists, default-device volume & mute). A new `widget/VolumePopup.tsx` follows the existing `CalendarPopup` overlay-window pattern, with a master volume row always visible and three tab-switched sections (Output / Apps / Input) built with plain visibility-toggled boxes (no `Gtk.Stack`). `app.ts` gets a `volumeVisible` state slot and registers the popup; `Volume.tsx` gets a click handler via `Gtk.GestureClick` that calls `togglePopup`.

**Tech Stack:** AGS 3.1.2, gnim (TS/TSX, GTK4), AstalWp (WirePlumber bindings), Dracula theme SCSS.

**Spec:** `docs/superpowers/specs/2026-06-11-volume-mixer-popup-design.md`

---

## Reference: AstalWp API used

- `Wp.get_default()!.audio` → `Audio` singleton
- `audio.get_speakers(): Endpoint[] | null`, `get_microphones()`, `get_streams()`
- Signals: `speaker-added/removed`, `microphone-added/removed`, `stream-added/removed` (arg = the `Endpoint`/`Stream`)
- `audio.get_default_speaker(): Endpoint | null`, `get_default_microphone()`, signals `notify::default-speaker` / `notify::default-microphone`
- `Endpoint`/`Stream` extend `Node`: `volume: number` (0–1), `mute: boolean`, `name`, `description`, `icon` (settable, with `notify::volume`/`notify::mute`)
- `Endpoint.is_default: boolean` (`notify::is-default`), `Endpoint.set_is_default(true)` switches the default device
- `<slider>` JSX → `Astal.Slider extends Gtk.Scale extends Gtk.Range`: props `min`, `max`, `step`, `value`; signal `value-changed` (handler receives the widget itself, no extra args)

---

### Task 1: Audio data layer + minimal popup (master volume) + wiring

**Files:**
- Create: `~/.config/ags/service/audio.ts`
- Create: `~/.config/ags/widget/VolumePopup.tsx`
- Modify: `~/.config/ags/app.ts`
- Modify: `~/.config/ags/widget/Volume.tsx`
- Modify: `~/.config/ags/style.scss`

- [ ] **Step 1: Create `service/audio.ts`**

```ts
// ~/.config/ags/service/audio.ts
import Wp from "gi://AstalWp"
import { createState } from "ags"

const audio = Wp.get_default()!.audio

export const [speakers, setSpeakers] = createState<Wp.Endpoint[]>(audio.get_speakers() ?? [])
export const [microphones, setMicrophones] = createState<Wp.Endpoint[]>(audio.get_microphones() ?? [])
export const [streams, setStreams] = createState<Wp.Stream[]>(audio.get_streams() ?? [])

audio.connect("speaker-added", (_a, e) => setSpeakers((s) => [...s, e]))
audio.connect("speaker-removed", (_a, e) => setSpeakers((s) => s.filter((x) => x.id !== e.id)))
audio.connect("microphone-added", (_a, e) => setMicrophones((s) => [...s, e]))
audio.connect("microphone-removed", (_a, e) => setMicrophones((s) => s.filter((x) => x.id !== e.id)))
audio.connect("stream-added", (_a, e) => setStreams((s) => [...s, e]))
audio.connect("stream-removed", (_a, e) => setStreams((s) => s.filter((x) => x.id !== e.id)))

export const [defaultSpeakerVolume, setDefaultSpeakerVolume] = createState(audio.get_default_speaker()?.volume ?? 0)
export const [defaultSpeakerMute, setDefaultSpeakerMute] = createState(audio.get_default_speaker()?.mute ?? true)
export const [defaultMicVolume, setDefaultMicVolume] = createState(audio.get_default_microphone()?.volume ?? 0)
export const [defaultMicMute, setDefaultMicMute] = createState(audio.get_default_microphone()?.mute ?? true)

let lastSpeaker: Wp.Endpoint | null = null
let lastSpeakerHandlers: number[] = []

function trackDefaultSpeaker(spk: Wp.Endpoint | null) {
  if (lastSpeaker) for (const id of lastSpeakerHandlers) lastSpeaker.disconnect(id)
  lastSpeakerHandlers = []
  lastSpeaker = spk

  if (!spk) {
    setDefaultSpeakerVolume(0)
    setDefaultSpeakerMute(true)
    return
  }

  setDefaultSpeakerVolume(spk.volume)
  setDefaultSpeakerMute(spk.mute)
  lastSpeakerHandlers.push(spk.connect("notify::volume", () => setDefaultSpeakerVolume(spk.volume)))
  lastSpeakerHandlers.push(spk.connect("notify::mute", () => setDefaultSpeakerMute(spk.mute)))
}

let lastMic: Wp.Endpoint | null = null
let lastMicHandlers: number[] = []

function trackDefaultMic(mic: Wp.Endpoint | null) {
  if (lastMic) for (const id of lastMicHandlers) lastMic.disconnect(id)
  lastMicHandlers = []
  lastMic = mic

  if (!mic) {
    setDefaultMicVolume(0)
    setDefaultMicMute(true)
    return
  }

  setDefaultMicVolume(mic.volume)
  setDefaultMicMute(mic.mute)
  lastMicHandlers.push(mic.connect("notify::volume", () => setDefaultMicVolume(mic.volume)))
  lastMicHandlers.push(mic.connect("notify::mute", () => setDefaultMicMute(mic.mute)))
}

trackDefaultSpeaker(audio.get_default_speaker())
trackDefaultMic(audio.get_default_microphone())
audio.connect("notify::default-speaker", () => trackDefaultSpeaker(audio.get_default_speaker()))
audio.connect("notify::default-microphone", () => trackDefaultMic(audio.get_default_microphone()))

export function setSpeakerVolume(v: number) {
  if (lastSpeaker) lastSpeaker.volume = Math.max(0, Math.min(1, v))
}

export function toggleSpeakerMute() {
  if (lastSpeaker) lastSpeaker.mute = !lastSpeaker.mute
}

export function setMicVolume(v: number) {
  if (lastMic) lastMic.volume = Math.max(0, Math.min(1, v))
}

export function toggleMicMute() {
  if (lastMic) lastMic.mute = !lastMic.mute
}

export function setDefaultDevice(endpoint: Wp.Endpoint) {
  endpoint.set_is_default(true)
}
```

- [ ] **Step 2: Create `widget/VolumePopup.tsx`** (master volume row only — Output/Apps/Input tabs added in later tasks)

```tsx
// ~/.config/ags/widget/VolumePopup.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import {
  defaultSpeakerVolume,
  defaultSpeakerMute,
  setSpeakerVolume,
  toggleSpeakerMute,
} from "../service/audio"
import { volumeVisible, setVolumeVisible } from "../app"

export default function VolumePopup(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor

  return (
    <window
      class="VolumePopup"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={volumeVisible.as((v) => v)}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setVolumeVisible(false)
        })
        self.add_controller(ctrl)
        const click = new Gtk.GestureClick()
        click.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        click.connect(
          "pressed",
          (gesture: any, _n: number, x: number, y: number) => {
            const child = self.get_child()
            if (!child) return
            const a = child.get_allocation()
            if (
              x >= a.x &&
              x <= a.x + a.width &&
              y >= a.y &&
              y <= a.y + a.height
            ) {
              gesture.set_state(Gtk.EventSequenceState.DENIED)
            } else {
              setVolumeVisible(false)
            }
          },
        )
        self.add_controller(click)
      }}
    >
      <box
        class="volume-popup"
        orientation={1}
        halign={Gtk.Align.END}
        valign={Gtk.Align.START}
        spacing={8}
      >
        <box class="volume-master" spacing={8}>
          <button class="volume-icon-btn" onClicked={() => toggleSpeakerMute()}>
            <label label={defaultSpeakerMute.as((m) => (m ? "🔇" : "🔊"))} />
          </button>
          <slider
            class="volume-slider"
            hexpand
            min={0}
            max={1}
            step={0.01}
            value={defaultSpeakerVolume}
            onValueChanged={(self: Gtk.Range) => setSpeakerVolume(self.get_value())}
          />
          <label
            class="volume-pct"
            label={defaultSpeakerVolume.as((v) => `${Math.round(v * 100)}%`)}
          />
        </box>
      </box>
    </window>
  )
}
```

- [ ] **Step 3: Wire up `app.ts`**

Replace the full file content with:

```ts
// ~/.config/ags/app.ts
import app from "ags/gtk4/app"
import style from "./style.scss"
import Bar from "./widget/Bar"
import WeatherPopup from "./widget/WeatherPopup"
import Dashboard from "./widget/Dashboard"
import TodoPopup from "./widget/TodoPopup"
import CalendarPopup from "./widget/CalendarPopup"
import NotificationPopups from "./widget/NotificationPopups"
import NotificationHistory from "./widget/NotificationHistory"
import VolumePopup from "./widget/VolumePopup"
import { createState } from "ags"

export const [dashboardVisible, setDashboardVisible] = createState(false)
export const [weatherVisible, setWeatherVisible] = createState(false)
export const [todoVisible, setTodoVisible] = createState(false)
export const [calendarVisible, setCalendarVisible] = createState(false)
export const [notifHistoryVisible, setNotifHistoryVisible] = createState(false)
export const [volumeVisible, setVolumeVisible] = createState(false)

function closeAllPopups(): void {
  setDashboardVisible(false)
  setWeatherVisible(false)
  setTodoVisible(false)
  setCalendarVisible(false)
  setNotifHistoryVisible(false)
  setVolumeVisible(false)
}

// Toggle one popup, closing any other popups that are open
export function togglePopup(visible: () => boolean, setVisible: (v: boolean) => void): void {
  const next = !visible()
  closeAllPopups()
  if (next) setVisible(true)
}

app.start({
  css: style,
  main() {
    const monitors = app.get_monitors()
    monitors.filter((m: any) => m.get_geometry().x > 0).map(Bar)
    Dashboard(monitors[0])
    WeatherPopup(monitors[0])
    TodoPopup(monitors[0])
    CalendarPopup(monitors[0])
    NotificationPopups(monitors[0])
    NotificationHistory(monitors[0])
    VolumePopup(monitors[0])
  },
})
```

- [ ] **Step 4: Add click handler to `widget/Volume.tsx`**

Replace the full file content with:

```tsx
// ~/.config/ags/widget/Volume.tsx
import { Gtk } from "ags/gtk4"
import Wp from "gi://AstalWp"
import { createBinding } from "ags"
import { togglePopup, volumeVisible, setVolumeVisible } from "../app"

export default function Volume() {
  const wp = Wp.get_default()
  const speaker = wp?.audio?.get_default_speaker()

  if (!speaker) return <box class="volume"><label label="🔇" /></box>

  const muteAcc = createBinding(speaker, "mute")
  const volAcc = createBinding(speaker, "volume")

  return (
    <box
      class="volume"
      $={(self: Gtk.Box) => {
        const scroll = new Gtk.EventControllerScroll()
        scroll.set_flags(Gtk.EventControllerScrollFlags.VERTICAL)
        scroll.connect("scroll", (_c: any, _dx: number, dy: number) => {
          const delta = dy > 0 ? -0.05 : 0.05
          speaker.volume = Math.max(0, Math.min(1, speaker.volume + delta))
        })
        self.add_controller(scroll)

        const click = new Gtk.GestureClick()
        click.connect("pressed", () => togglePopup(volumeVisible, setVolumeVisible))
        self.add_controller(click)
      }}
    >
      <label label={muteAcc.as(m => m ? "🔇" : "🔊")} />
      <label
        label={volAcc.as(v => ` ${Math.round(v * 100)}%`)}
        visible={muteAcc.as(m => !m)}
      />
    </box>
  )
}
```

- [ ] **Step 5: Add styles to `style.scss`**

Insert after the `.CalendarPopup { ... }` block (after line 616, before `/* Notification popups */`):

```scss
/* Volume popup */
.VolumePopup {
  background: transparent;

  .volume-popup {
    background: #282a36;
    border: 1px solid #44475a;
    border-radius: 10px;
    padding: 16px;
    min-width: 280px;
    margin: 6px;
  }

  .volume-master {
    .volume-icon-btn {
      background: transparent;
      border: none;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 16px;

      &:hover { background: #44475a; }
    }

    .volume-slider {
      trough { background: #44475a; border-radius: 3px; min-height: 6px; }
      highlight { background: #bd93f9; border-radius: 3px; }
      slider { background: #f8f8f2; border-radius: 50%; min-width: 12px; min-height: 12px; }
    }

    .volume-pct {
      color: #6272a4;
      font-size: 12px;
      min-width: 36px;
    }
  }
}
```

- [ ] **Step 6: Compile check**

Run: `ags bundle ~/.config/ags/app.ts /tmp/check.js`
Expected: completes with no errors.

- [ ] **Step 7: Manual verification**

Run `~/.config/ags/watch.sh` (or `ags quit && ags run ~/.config/ags`), then:
1. Click the `Volume` widget on the bar → popup appears top-right with master row (icon, slider, percent label).
2. Drag the slider → volume changes; confirm with `wpctl get-volume @DEFAULT_AUDIO_SINK@`.
3. Click the speaker icon → toggles mute (🔊 ↔ 🔇); confirm with `wpctl get-volume @DEFAULT_AUDIO_SINK@` (shows `[MUTED]`).
4. Scroll over the bar `Volume` widget → still adjusts volume.
5. Click outside the popup, then reopen and press `Esc` → both close it.

- [ ] **Step 8: Commit**

```bash
cd ~/.config/ags
config add service/audio.ts widget/VolumePopup.tsx app.ts widget/Volume.tsx style.scss
config commit -m "feat(ags): add volume mixer popup with master volume control"
```

---

### Task 2: Output tab (tab bar + device picker)

**Files:**
- Modify: `~/.config/ags/widget/VolumePopup.tsx`
- Modify: `~/.config/ags/style.scss`

- [ ] **Step 1: Add tab state, tab bar, and Output tab content**

In `widget/VolumePopup.tsx`:

1. Add two new import lines, and extend the `service/audio` import:

```tsx
import { createState, createBinding, For } from "ags"
import Wp from "gi://AstalWp"
import {
  defaultSpeakerVolume,
  defaultSpeakerMute,
  setSpeakerVolume,
  toggleSpeakerMute,
  speakers,
  setDefaultDevice,
} from "../service/audio"
```

2. Inside `VolumePopup()`, before the `return`, add:

```tsx
const [activeTab, setActiveTab] = createState(0)
```

3. After the `<box class="volume-master">...</box>` block (still inside `<box class="volume-popup">`), add:

```tsx
<box class="volume-tabs" spacing={4} homogeneous>
  <button
    class={activeTab.as((t) => (t === 0 ? "volume-tab active" : "volume-tab"))}
    onClicked={() => setActiveTab(0)}
  >
    <label label="Output" />
  </button>
  <button
    class={activeTab.as((t) => (t === 1 ? "volume-tab active" : "volume-tab"))}
    onClicked={() => setActiveTab(1)}
  >
    <label label="Apps" />
  </button>
  <button
    class={activeTab.as((t) => (t === 2 ? "volume-tab active" : "volume-tab"))}
    onClicked={() => setActiveTab(2)}
  >
    <label label="Input" />
  </button>
</box>

<box
  class="volume-tab-content"
  orientation={1}
  spacing={4}
  visible={activeTab.as((t) => t === 0)}
>
  <For each={speakers}>
    {(spk: Wp.Endpoint) => (
      <button
        class={createBinding(spk, "is-default").as((d) =>
          d ? "volume-device active" : "volume-device",
        )}
        onClicked={() => setDefaultDevice(spk)}
      >
        <box spacing={8}>
          <image iconName={spk.icon} />
          <label
            label={spk.description ?? spk.name ?? "Unknown device"}
            hexpand
            halign={Gtk.Align.START}
          />
        </box>
      </button>
    )}
  </For>
</box>
```

- [ ] **Step 2: Add tab bar and device list styles to `style.scss`**

Inside the `.VolumePopup { ... }` block (added in Task 1), after `.volume-master { ... }`, add:

```scss
  .volume-tabs {
    margin-top: 4px;
  }

  .volume-tab {
    background: #44475a;
    color: #f8f8f2;
    border: none;
    border-radius: 6px;
    padding: 4px 0;
    font-size: 12px;

    &.active {
      background: #bd93f9;
      color: #282a36;
      font-weight: bold;
    }

    &:hover { background: #6272a4; }
  }

  .volume-tab-content {
    margin-top: 4px;
  }

  .volume-device {
    background: #44475a;
    border-radius: 6px;
    padding: 6px 10px;
    color: #f8f8f2;

    &.active {
      background: #bd93f9;
      color: #282a36;
    }

    &:hover { background: #6272a4; }
  }
```

- [ ] **Step 3: Compile check**

Run: `ags bundle ~/.config/ags/app.ts /tmp/check.js`
Expected: completes with no errors.

- [ ] **Step 4: Manual verification**

With `watch.sh` running:
1. Open the popup → tab bar shows "Output / Apps / Input" under the master row, "Output" highlighted (active state persists from `activeTab` default of 0).
2. Output tab lists your speaker(s); the currently-active device is highlighted (`.active` style).
3. Click a different speaker row → it becomes the default; confirm with `wpctl status` (Audio/Sinks section, the new device shows as default).
4. Click "Apps" / "Input" tabs → Output content hides (no content shown yet for those tabs — added in Tasks 3–4); click back to "Output" → list reappears.

- [ ] **Step 5: Commit**

```bash
cd ~/.config/ags
config add widget/VolumePopup.tsx style.scss
config commit -m "feat(ags): add output device tab to volume popup"
```

---

### Task 3: Apps tab (per-app mixer)

**Files:**
- Modify: `~/.config/ags/widget/VolumePopup.tsx`
- Modify: `~/.config/ags/style.scss`

- [ ] **Step 1: Add Apps tab content**

In `widget/VolumePopup.tsx`:

1. Add `streams` to the `service/audio` import:

```tsx
import {
  defaultSpeakerVolume,
  defaultSpeakerMute,
  setSpeakerVolume,
  toggleSpeakerMute,
  speakers,
  streams,
  setDefaultDevice,
} from "../service/audio"
```

2. After the Output tab's `<box class="volume-tab-content" ... visible={activeTab.as((t) => t === 0)}>...</box>`, add:

```tsx
<box
  class="volume-tab-content"
  orientation={1}
  spacing={4}
  visible={activeTab.as((t) => t === 1)}
>
  <For each={streams}>
    {(stream: Wp.Stream) => (
      <box class="volume-app-row" spacing={8}>
        <button
          class={createBinding(stream, "mute").as((m) =>
            m ? "volume-app-icon-btn muted" : "volume-app-icon-btn",
          )}
          onClicked={() => { stream.mute = !stream.mute }}
        >
          <image iconName={stream.icon} />
        </button>
        <label
          class="volume-app-name"
          label={stream.description ?? stream.name ?? "Unknown app"}
          hexpand
          halign={Gtk.Align.START}
        />
        <slider
          class="volume-app-slider"
          min={0}
          max={1}
          step={0.01}
          value={createBinding(stream, "volume")}
          onValueChanged={(self: Gtk.Range) => {
            stream.volume = Math.max(0, Math.min(1, self.get_value()))
          }}
        />
      </box>
    )}
  </For>
  <label
    class="volume-empty"
    label="No apps playing audio"
    visible={streams.as((s) => s.length === 0)}
  />
</box>
```

- [ ] **Step 2: Add app row styles to `style.scss`**

Inside `.VolumePopup { ... }`, after `.volume-device { ... }`, add:

```scss
  .volume-app-row {
    .volume-app-name {
      color: #f8f8f2;
      font-size: 12px;
    }

    .volume-app-slider {
      min-width: 90px;

      trough { background: #44475a; border-radius: 3px; min-height: 6px; }
      highlight { background: #bd93f9; border-radius: 3px; }
      slider { background: #f8f8f2; border-radius: 50%; min-width: 10px; min-height: 10px; }
    }

    .volume-app-icon-btn {
      background: transparent;
      border: none;
      border-radius: 4px;
      padding: 2px 4px;

      &:hover { background: #44475a; }

      &.muted { opacity: 0.4; }
    }
  }

  .volume-empty {
    color: #6272a4;
    font-size: 12px;
    padding: 8px 0;
  }
```

- [ ] **Step 3: Compile check**

Run: `ags bundle ~/.config/ags/app.ts /tmp/check.js`
Expected: completes with no errors.

- [ ] **Step 4: Manual verification**

With `watch.sh` running:
1. With nothing playing audio, open popup → "Apps" tab shows "No apps playing audio".
2. Start audio playback (e.g. `mpv --no-video ~/some-audio-file` or play something in a browser/Spotify) → switch to "Apps" tab → a row appears with the app's icon, name, and a slider.
3. Drag the app's slider → only that app's volume changes; confirm with `wpctl status` (Streams section) or by ear.
4. Click the app's icon → toggles mute for that app only (icon dims via `.muted` style).
5. Stop playback → row disappears, empty-state label reappears.

- [ ] **Step 5: Commit**

```bash
cd ~/.config/ags
config add widget/VolumePopup.tsx style.scss
config commit -m "feat(ags): add per-app mixer tab to volume popup"
```

---

### Task 4: Input tab (microphone)

**Files:**
- Modify: `~/.config/ags/widget/VolumePopup.tsx`
- Modify: `~/.config/ags/style.scss`

- [ ] **Step 1: Add Input tab content**

In `widget/VolumePopup.tsx`:

1. Add the remaining mic-related exports to the `service/audio` import:

```tsx
import {
  defaultSpeakerVolume,
  defaultSpeakerMute,
  setSpeakerVolume,
  toggleSpeakerMute,
  speakers,
  streams,
  setDefaultDevice,
  defaultMicVolume,
  defaultMicMute,
  setMicVolume,
  toggleMicMute,
  microphones,
} from "../service/audio"
```

2. After the Apps tab's `<box class="volume-tab-content" ... visible={activeTab.as((t) => t === 1)}>...</box>`, add:

```tsx
<box
  class="volume-tab-content"
  orientation={1}
  spacing={4}
  visible={activeTab.as((t) => t === 2)}
>
  <box class="volume-master" spacing={8}>
    <button class="volume-icon-btn" onClicked={() => toggleMicMute()}>
      <label label={defaultMicMute.as((m) => (m ? "🔇" : "🎙️"))} />
    </button>
    <slider
      class="volume-slider"
      hexpand
      min={0}
      max={1}
      step={0.01}
      value={defaultMicVolume}
      onValueChanged={(self: Gtk.Range) => setMicVolume(self.get_value())}
    />
    <label
      class="volume-pct"
      label={defaultMicVolume.as((v) => `${Math.round(v * 100)}%`)}
    />
  </box>
  <box class="volume-divider" />
  <For each={microphones}>
    {(mic: Wp.Endpoint) => (
      <button
        class={createBinding(mic, "is-default").as((d) =>
          d ? "volume-device active" : "volume-device",
        )}
        onClicked={() => setDefaultDevice(mic)}
      >
        <box spacing={8}>
          <image iconName={mic.icon} />
          <label
            label={mic.description ?? mic.name ?? "Unknown device"}
            hexpand
            halign={Gtk.Align.START}
          />
        </box>
      </button>
    )}
  </For>
</box>
```

- [ ] **Step 2: Add divider style to `style.scss`**

Inside `.VolumePopup { ... }`, after `.volume-empty { ... }`, add:

```scss
  .volume-divider {
    background: #44475a;
    min-height: 1px;
    margin: 8px 0;
  }
```

- [ ] **Step 3: Compile check**

Run: `ags bundle ~/.config/ags/app.ts /tmp/check.js`
Expected: completes with no errors.

- [ ] **Step 4: Manual verification**

With `watch.sh` running:
1. Open popup, click "Input" tab → shows mic icon/slider/percent row, a divider, and a list of input devices (mic active one highlighted).
2. Drag the mic slider → confirm with `wpctl get-volume @DEFAULT_AUDIO_SOURCE@`.
3. Click the mic icon → toggles mute; confirm with `wpctl get-volume @DEFAULT_AUDIO_SOURCE@` (shows `[MUTED]`).
4. Click a different input device → it becomes default; confirm with `wpctl status` (Audio/Sources section).
5. Full regression pass (spec testing plan items 3–9): master volume/mute, output switch, app mixer, mic controls, click-outside/Esc close, bar-widget scroll — all still work together.

- [ ] **Step 5: Commit**

```bash
cd ~/.config/ags
config add widget/VolumePopup.tsx style.scss
config commit -m "feat(ags): add microphone input tab to volume popup"
```
