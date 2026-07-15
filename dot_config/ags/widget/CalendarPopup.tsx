// ~/.config/ags/widget/CalendarPopup.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { createState, With } from "ags"
import { calendarVisible, setCalendarVisible } from "../app"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DOW_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function getMonthYear(offset: number): { month: number; year: number } {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  return { month: d.getMonth(), year: d.getFullYear() }
}

function getMonthLabel(offset: number): string {
  const { month, year } = getMonthYear(offset)
  return `${MONTH_NAMES[month]} ${year}`
}

function getCalendarWeeks(
  offset: number,
): { day: number | null; isToday: boolean }[][] {
  const now = new Date()
  const { month, year } = getMonthYear(offset)
  // Monday-first: shift getDay() so Mon=0, Tue=1, ..., Sun=6
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayDate = now.getDate()
  const isCurrentMonth = offset === 0

  const cells: { day: number | null; isToday: boolean }[] = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, isToday: isCurrentMonth && d === todayDate })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, isToday: false })

  const weeks: { day: number | null; isToday: boolean }[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export default function CalendarPopup(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor
  const [monthOffset, setMonthOffset] = createState(0)

  // Reset to current month each time the popup opens
  calendarVisible.subscribe(() => {
    if (calendarVisible()) setMonthOffset(0)
  })

  return (
    <window
      class="CalendarPopup"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={calendarVisible.as((v) => v)}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setCalendarVisible(false)
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
              setCalendarVisible(false)
            }
          },
        )
        self.add_controller(click)
      }}
    >
      <box
        class="calendar-box"
        orientation={1}
        halign={Gtk.Align.END}
        valign={Gtk.Align.START}
        spacing={4}
      >
        {/* Month navigation row */}
        <box spacing={0}>
          <button
            class="calendar-nav-arrow"
            onClicked={() => setMonthOffset(monthOffset() - 1)}
          >
            <label label="◀" />
          </button>
          <label
            class="calendar-nav-label"
            label={monthOffset.as((o) => getMonthLabel(o))}
            hexpand={true}
            halign={Gtk.Align.CENTER}
          />
          <button
            class="calendar-nav-arrow"
            onClicked={() => setMonthOffset(monthOffset() + 1)}
          >
            <label label="▶" />
          </button>
        </box>

        {/* Day-of-week headers (static) */}
        <box spacing={0} homogeneous={true}>
          {DOW_LABELS.map((d) => (
            <label class="calendar-dow" label={d} halign={Gtk.Align.CENTER} />
          ))}
        </box>

        {/* Week rows (reactive on monthOffset) */}
        <With value={monthOffset}>
          {(offset) => {
            const weeks = getCalendarWeeks(offset)
            return (
              <box orientation={1} spacing={0}>
                {weeks.map((week) => (
                  <box spacing={0} homogeneous={true}>
                    {week.map((cell) =>
                      cell.day === null ? (
                        <label
                          class="calendar-empty"
                          label=" "
                          halign={Gtk.Align.CENTER}
                        />
                      ) : (
                        <label
                          class={
                            cell.isToday ? "calendar-day today" : "calendar-day"
                          }
                          label={String(cell.day)}
                          halign={Gtk.Align.CENTER}
                        />
                      ),
                    )}
                  </box>
                ))}
              </box>
            )
          }}
        </With>
      </box>
    </window>
  )
}
