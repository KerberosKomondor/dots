// ~/.config/ags/widget/NotificationHistory.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { With, createState } from "ags"
import Notifd from "gi://AstalNotifd"
import { notifHistoryVisible, setNotifHistoryVisible } from "../app"
import { history, clearHistory, removeFromHistory, notifIcon, notifImagePixbuf, urgencyClass } from "../service/notifications"

function relativeTime(unixSeconds: number): string {
  const diffSec = Math.floor(Date.now() / 1000) - unixSeconds
  if (diffSec < 60) return "just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  return `${Math.floor(diffHour / 24)}d ago`
}

function renderRow(notif: Notifd.Notification) {
  const icon = notifIcon(notif, 24)
  return (
    <box class="notif-history-row" spacing={8}>
      <image
        class="notif-icon"
        iconName={icon.iconName}
        pixelSize={24}
        valign={Gtk.Align.START}
        $={(self: any) => { if (icon.pixbuf) self.set_from_pixbuf(icon.pixbuf) }}
      />
      <box orientation={1} hexpand>
        <label
          class={`notif-history-app ${urgencyClass(notif)}`}
          label={`${notif.app_name} · ${relativeTime(notif.get_time())}`}
          halign={Gtk.Align.START}
        />
        <label
          class="notif-history-title"
          label={notif.summary}
          halign={Gtk.Align.START}
          maxWidthChars={40}
          ellipsize={3}
        />
        <label
          class="notif-history-body"
          label={notif.body}
          halign={Gtk.Align.START}
          wrap
          lines={2}
          maxWidthChars={40}
          ellipsize={3}
        />
        {(() => {
          const pb = notifImagePixbuf(notif)
          return pb ? (
            <image class="notif-preview-image" $={(self: any) => self.set_from_pixbuf(pb)} />
          ) : null
        })()}
      </box>
      <button class="notif-history-x" valign={Gtk.Align.START} onClicked={() => removeFromHistory(notif.id)}>
        <label label="✕" />
      </button>
    </box>
  )
}

export default function NotificationHistory(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor
  const [expandedApps, setExpandedApps] = createState<Set<string>>(new Set())

  const toggleExpanded = (appName: string) => {
    setExpandedApps(prev => {
      const next = new Set(prev)
      if (next.has(appName)) next.delete(appName)
      else next.add(appName)
      return next
    })
  }

  return (
    <window
      class="NotificationHistory"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={notifHistoryVisible.as(v => v)}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setNotifHistoryVisible(false)
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
            setNotifHistoryVisible(false)
          }
        })
        self.add_controller(click)
      }}
    >
      <box class="notif-history" orientation={1} halign={Gtk.Align.END} valign={Gtk.Align.START}>
        <box class="notif-history-header">
          <label label="Notifications" hexpand halign={Gtk.Align.START} />
          <button class="notif-history-clear" onClicked={() => clearHistory()}>
            <label label="Clear all" />
          </button>
        </box>
        <box class="notif-history-divider" />
        <With value={history}>
          {(list: Notifd.Notification[]) => {
            if (list.length === 0) {
              return <label class="notif-history-empty" label="Nothing here" halign={Gtk.Align.CENTER} />
            }

            // history is newest-first; notifs[0] is the most recent for this app
            const groups = new Map<string, Notifd.Notification[]>()
            for (const notif of list) {
              const arr = groups.get(notif.app_name)
              if (arr) arr.push(notif)
              else groups.set(notif.app_name, [notif])
            }

            return (
              <box orientation={1} spacing={2} class="notif-history-list">
                {Array.from(groups.entries()).map(([appName, notifs]) => {
                  if (notifs.length === 1) return renderRow(notifs[0])

                  const newest = notifs[0]
                  return (
                    <box orientation={1} class="notif-history-group">
                      <With value={expandedApps}>
                        {(expanded: Set<string>) => {
                          const isOpen = expanded.has(appName)
                          return (
                            <box orientation={1}>
                              <button class="notif-history-app-header" onClicked={() => toggleExpanded(appName)}>
                                <box spacing={6}>
                                  <label label={isOpen ? "▾" : "▸"} />
                                  <label
                                    label={`${appName} ×${notifs.length} · ${relativeTime(newest.get_time())}`}
                                    hexpand
                                    halign={Gtk.Align.START}
                                  />
                                </box>
                              </button>
                              {isOpen ? (
                                <box orientation={1} spacing={2}>
                                  {notifs.map(notif => renderRow(notif))}
                                </box>
                              ) : renderRow(newest)}
                            </box>
                          )
                        }}
                      </With>
                    </box>
                  )
                })}
              </box>
            )
          }}
        </With>
      </box>
    </window>
  )
}
