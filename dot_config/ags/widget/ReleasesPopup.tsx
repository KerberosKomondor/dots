// ~/.config/ags/widget/ReleasesPopup.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { With } from "ags"
import { releases, refreshReleases, ReleaseKind } from "../service/releases"
import { releasesVisible, setReleasesVisible } from "../app"

const KIND_ICON: Record<ReleaseKind, string> = {
  episode: "", // fa-tv
  movie: "",   // fa-film
  album: "",   // fa-music
}

export default function ReleasesPopup(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor

  // Refresh on open so the list is current (subscribe callback gets no args — read accessor)
  releasesVisible.subscribe(() => {
    if (releasesVisible()) refreshReleases()
  })

  return (
    <window
      class="ReleasesPopup"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={releasesVisible.as(v => v)}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setReleasesVisible(false)
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
            setReleasesVisible(false)
          }
        })
        self.add_controller(click)
      }}
    >
      <box class="releases-popup" orientation={1} halign={Gtk.Align.END} valign={Gtk.Align.START}>
        <label class="releases-header" label="RELEASING TODAY" halign={Gtk.Align.START} />
        <With value={releases}>
          {(list) => (
            <box orientation={1} spacing={4}>
              {list.length === 0
                ? <label class="releases-empty" label="Nothing today" halign={Gtk.Align.START} />
                : list.map(r => (
                    <box class={`release-row release-${r.kind}`} spacing={10}>
                      <label class="release-kind" label={KIND_ICON[r.kind]} valign={Gtk.Align.CENTER} />
                      <box orientation={1} hexpand>
                        <label class="release-title" label={r.title} halign={Gtk.Align.START} xalign={0} ellipsize={3} maxWidthChars={40} />
                        <label
                          class="release-sub"
                          label={r.time ? `${r.subtitle} · ${r.time}` : r.subtitle}
                          halign={Gtk.Align.START}
                          xalign={0}
                          ellipsize={3}
                          maxWidthChars={48}
                        />
                      </box>
                      <label
                        class={r.downloaded ? "release-status done" : "release-status pending"}
                        label={r.downloaded ? "" : "•"}
                        valign={Gtk.Align.CENTER}
                        tooltipText={r.downloaded ? "Downloaded" : "Not downloaded yet"}
                      />
                    </box>
                  ))}
            </box>
          )}
        </With>
      </box>
    </window>
  )
}
