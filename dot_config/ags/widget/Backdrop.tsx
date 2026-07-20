// ~/.config/ags/widget/Backdrop.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"

export default function Backdrop(
  gdkmonitor: Gdk.Monitor,
  visible: any,
  onClose: () => void,
) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor

  return (
    <window
      class="Backdrop"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      exclusivity={Astal.Exclusivity.IGNORE}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={visible}
      application={app}
    >
      <box
        hexpand
        vexpand
        $={(self: Gtk.Box) => {
          const click = new Gtk.GestureClick()
          click.connect("pressed", () => onClose())
          self.add_controller(click)
        }}
      />
    </window>
  )
}
