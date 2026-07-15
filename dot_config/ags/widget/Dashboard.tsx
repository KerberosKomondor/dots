// ~/.config/ags/widget/Dashboard.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { createBinding } from "ags"
import { execAsync } from "ags/process"
import Wp from "gi://AstalWp"
import Network from "gi://AstalNetwork"
import Bluetooth from "gi://AstalBluetooth"
import Notifd from "gi://AstalNotifd"
import { dashboardVisible, setDashboardVisible } from "../app"

export default function Dashboard(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor

  const wp = Wp.get_default()
  const speaker = wp?.audio?.get_default_speaker()
  const mic = wp?.audio?.get_default_microphone()
  const network = Network.get_default()
  const bt = Bluetooth.get_default()
  const notifd = Notifd.get_default()

  // Bindings for toggles
  const wifiEnabled = network?.wifi ? createBinding(network.wifi, "enabled") : null
  const btPowered = bt ? createBinding(bt, "isPowered") : null
  const dontDisturb = notifd ? createBinding(notifd, "dontDisturb") : null
  const speakerMute = speaker ? createBinding(speaker, "mute") : null
  const micMute = mic ? createBinding(mic, "mute") : null

  return (
    <window
      class="Dashboard"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={dashboardVisible as unknown as boolean}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setDashboardVisible(false)
        })
        self.add_controller(ctrl)
        const click = new Gtk.GestureClick()
        click.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        click.connect("pressed", (gesture: any, _n: number, x: number, y: number) => {
          const child = self.get_child()
          if (!child) return
          const a = child.get_allocation()
          if (x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height) {
            gesture.set_state(Gtk.EventSequenceState.DENIED)
          } else {
            setDashboardVisible(false)
          }
        })
        self.add_controller(click)
      }}
    >
      <box class="dashboard-popup" orientation={1} spacing={0} halign={Gtk.Align.START} valign={Gtk.Align.START}>

        {/* Profile card */}
        <box class="dash-profile" spacing={12}>
          <label class="dash-profile-icon" label="󰣇" />
          <box orientation={1}>
            <label class="dash-profile-name" label="appa" halign={Gtk.Align.START} />
            <label class="dash-profile-sub" label="Hyprland" halign={Gtk.Align.START} />
          </box>
        </box>

        {/* Power buttons */}
        <box class="dash-power" spacing={8} homogeneous>
          <button
            class="dash-power-btn shutdown"
            onClicked={() => { setDashboardVisible(false); execAsync(["systemctl", "poweroff"]) }}
          >
            <box orientation={1}>
              <label class="dash-power-icon" label="󰐥" />
              <label label="Shutdown" />
            </box>
          </button>
          <button
            class="dash-power-btn restart"
            onClicked={() => { setDashboardVisible(false); execAsync(["systemctl", "reboot"]) }}
          >
            <box orientation={1}>
              <label class="dash-power-icon" label="󰜉" />
              <label label="Restart" />
            </box>
          </button>
          <button
            class="dash-power-btn logout"
            onClicked={() => { setDashboardVisible(false); execAsync(["hyprctl", "dispatch", "exit"]) }}
          >
            <box orientation={1}>
              <label class="dash-power-icon" label="󰍃" />
              <label label="Logout" />
            </box>
          </button>
        </box>

        <box class="dash-divider" />

        {/* Toggles */}
        <box class="dash-toggles" spacing={8} homogeneous>

          {/* WiFi */}
          <button
            class={wifiEnabled
              ? wifiEnabled.as(v => v ? "dash-toggle on" : "dash-toggle")
              : "dash-toggle"}
            onClicked={() => {
              if (network?.wifi) network.wifi.enabled = !network.wifi.enabled
            }}
          >
            <box orientation={1}>
              <label class="dash-toggle-icon" label="󰤨" />
              <label class="dash-toggle-label" label="WiFi" />
            </box>
          </button>

          {/* Bluetooth */}
          <button
            class={btPowered
              ? btPowered.as(v => v ? "dash-toggle on" : "dash-toggle")
              : "dash-toggle"}
            onClicked={() => { if (bt) bt.toggle() }}
          >
            <box orientation={1}>
              <label class="dash-toggle-icon" label="󰂯" />
              <label class="dash-toggle-label" label="Bluetooth" />
            </box>
          </button>

          {/* Notifications (DnD) — "on" = notifications enabled = dontDisturb is FALSE */}
          <button
            class={dontDisturb
              ? dontDisturb.as(v => v ? "dash-toggle" : "dash-toggle on")
              : "dash-toggle on"}
            onClicked={() => {
              if (notifd) notifd.dontDisturb = !notifd.dontDisturb
            }}
          >
            <box orientation={1}>
              <label class="dash-toggle-icon" label="󰂚" />
              <label class="dash-toggle-label" label="Notifs" />
            </box>
          </button>

          {/* Speaker mute */}
          <button
            class={speakerMute
              ? speakerMute.as(v => v ? "dash-toggle" : "dash-toggle on")
              : "dash-toggle on"}
            onClicked={() => {
              if (speaker) speaker.mute = !speaker.mute
            }}
          >
            <box orientation={1}>
              <label class="dash-toggle-icon" label="󰕾" />
              <label class="dash-toggle-label" label="Volume" />
            </box>
          </button>

          {/* Mic mute */}
          <button
            class={micMute
              ? micMute.as(v => v ? "dash-toggle" : "dash-toggle on")
              : "dash-toggle on"}
            onClicked={() => {
              if (mic) mic.mute = !mic.mute
            }}
          >
            <box orientation={1}>
              <label class="dash-toggle-icon" label="󰍬" />
              <label class="dash-toggle-label" label="Mic" />
            </box>
          </button>

        </box>
      </box>
    </window>
  )
}
