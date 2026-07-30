// ~/.config/ags/widget/DictatePill.tsx
import { Astal, Gdk, Gtk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { With } from "ags"
import { dictateState } from "../service/dictate"

const BAR_COUNT = 15

export default function DictatePill(gdkmonitor: Gdk.Monitor) {
  const { BOTTOM } = Astal.WindowAnchor

  return (
    <window
      class="DictatePill"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      anchor={BOTTOM}
      visible={dictateState.as((s) => s !== "idle")}
      application={app}
    >
      <box class={dictateState.as((s) => `dictate-pill ${s}`)} spacing={9}>
        <box class="dictate-dot" valign={Gtk.Align.CENTER} />
        <With value={dictateState}>
          {(s) => {
            if (s === "recording") {
              return (
                <box class="dictate-bars" spacing={2.5} valign={Gtk.Align.CENTER}>
                  {Array.from({ length: BAR_COUNT }, (_, i) => (
                    <box class={`dictate-bar dictate-bar-${i}`} valign={Gtk.Align.CENTER} />
                  ))}
                </box>
              )
            }
            if (s === "transcribing") {
              return (
                <box class="dictate-processing" spacing={5} valign={Gtk.Align.CENTER}>
                  <box class="dictate-proc-dot dictate-proc-dot-1" valign={Gtk.Align.CENTER} />
                  <box class="dictate-proc-dot dictate-proc-dot-2" valign={Gtk.Align.CENTER} />
                  <box class="dictate-proc-dot dictate-proc-dot-3" valign={Gtk.Align.CENTER} />
                </box>
              )
            }
            return null
          }}
        </With>
      </box>
    </window>
  )
}
