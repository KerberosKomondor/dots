// ~/.config/ags/widget/Bar.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import DashboardButton from "./DashboardButton"
import Workspaces from "./Workspaces"
import WindowTitle from "./WindowTitle"
import Volume from "./Volume"
import Clock from "./Clock"
import Cmus from "./Cmus"
import Notifications from "./Notifications"
import Tray from "./Tray"
import Weather from "./Weather"
import Releases from "./Releases"

export default function Bar(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

  return (
    <window
      class="Bar"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.TOP}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | RIGHT}
      visible={true}
      application={app}
    >
      <box>
        <box hexpand halign={Gtk.Align.START} class="bar-left">
          <DashboardButton />
          <Workspaces />
          <WindowTitle />
        </box>
        <box halign={Gtk.Align.END} class="bar-right" spacing={10}>
          <Cmus />
          <Tray />
          <Releases />
          <Notifications />
          <Volume />
          <Weather />
          <Clock />
        </box>
      </box>
    </window>
  )
}
