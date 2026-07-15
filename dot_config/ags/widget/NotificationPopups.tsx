// ~/.config/ags/widget/NotificationPopups.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { For, createState } from "ags"
import { interval } from "ags/time"
import Notifd from "gi://AstalNotifd"
import { setNotifHistoryVisible } from "../app"
import {
  popupStack, overflowCount, dismissPopup, urgencyClass, notifIcon, notifImagePixbuf, invokeAction,
  pauseTimer, resumeTimer, getTimerFraction, type PopupGroup,
} from "../service/notifications"

const PROGRESS_TRACK_PX = 254 // 320 (row) - 24 (padding) - 32 (icon) - 10 (spacing)

export default function NotificationPopups(gdkmonitor: Gdk.Monitor) {
  const { TOP, RIGHT } = Astal.WindowAnchor

  return (
    <window
      class="NotificationPopups"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.NONE}
      anchor={TOP | RIGHT}
      visible={popupStack.as((s: PopupGroup[]) => s.length > 0)}
      application={app}
    >
      <box orientation={1} spacing={8} class="notif-popups">
        <button
          class="notif-dismiss-all"
          halign={Gtk.Align.END}
          onClicked={() => popupStack().forEach(g => dismissPopup(g.notif))}
        >
          <label label="Clear all" />
        </button>
        <For each={popupStack} id={(g: PopupGroup) => g.notif.id}>
          {(g: PopupGroup) => {
            const notif = g.notif
            const icon = notifIcon(notif)
            // The "default" action represents clicking the notification body
            // itself (e.g. focus the sending app's window), not a UI button —
            // per the notification spec it shouldn't be rendered separately.
            const actions = notif.get_actions().filter(a => a.id !== "default")
            const initialFraction = getTimerFraction(notif.id)
            const showProgress = initialFraction !== null
            const [progress, setProgress] = createState(initialFraction ?? 1)

            const tick = showProgress
              ? interval(100, () => {
                  const frac = getTimerFraction(notif.id)
                  if (frac !== null) setProgress(frac)
                })
              : null

            let actionsBox: any = null

            return (
              <box
                class={`notif-popup-row ${urgencyClass(notif)}`}
                spacing={10}
                $={(self: any) => {
                  self.connect("destroy", () => tick?.cancel())

                  const motion = new Gtk.EventControllerMotion()
                  motion.connect("enter", () => pauseTimer(notif.id))
                  motion.connect("leave", () => resumeTimer(notif.id))
                  self.add_controller(motion)

                  const click = new Gtk.GestureClick()
                  click.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
                  click.connect("pressed", (gesture: any, _n: number, x: number, y: number) => {
                    if (actionsBox) {
                      const a = actionsBox.get_allocation()
                      if (x >= a.x && x <= a.x + a.width && y >= a.y && y <= a.y + a.height) {
                        gesture.set_state(Gtk.EventSequenceState.DENIED)
                        return
                      }
                    }
                    dismissPopup(notif)
                  })
                  self.add_controller(click)
                }}
              >
                <image
                  class="notif-icon"
                  iconName={icon.iconName}
                  pixelSize={32}
                  valign={Gtk.Align.START}
                  $={(self: any) => { if (icon.pixbuf) self.set_from_pixbuf(icon.pixbuf) }}
                />
                <box orientation={1} hexpand class="notif-content">
                  <box spacing={6}>
                    <label class="notif-app" label={notif.app_name} halign={Gtk.Align.START} />
                    {g.count > 1 ? <label class="notif-popup-count" label={`×${g.count}`} /> : null}
                  </box>
                  <label class="notif-title" label={notif.summary} halign={Gtk.Align.START} wrap maxWidthChars={32} />
                  <label class="notif-body" label={notif.body} halign={Gtk.Align.START} wrap maxWidthChars={32} />
                  {(() => {
                    const pb = notifImagePixbuf(notif)
                    return pb ? (
                      <image class="notif-preview-image" $={(self: any) => self.set_from_pixbuf(pb)} />
                    ) : null
                  })()}
                  {actions.length > 0 ? (
                    <box class="notif-actions" spacing={6} $={(self: any) => { actionsBox = self }}>
                      {actions.map(action => (
                        <button class="notif-action-btn" onClicked={() => invokeAction(notif, action.id)}>
                          <label label={action.label} />
                        </button>
                      ))}
                    </box>
                  ) : null}
                  {showProgress && (
                    <box class="notif-progress">
                      <box
                        class="notif-progress-bar"
                        halign={Gtk.Align.START}
                        widthRequest={progress.as((p: number) => Math.round(p * PROGRESS_TRACK_PX))}
                      />
                    </box>
                  )}
                </box>
              </box>
            )
          }}
        </For>
        <button
          class="notif-overflow"
          visible={overflowCount.as((n: number) => n > 0)}
          onClicked={() => setNotifHistoryVisible(true)}
        >
          <label label={overflowCount.as((n: number) => `+${n} more`)} />
        </button>
      </box>
    </window>
  )
}
