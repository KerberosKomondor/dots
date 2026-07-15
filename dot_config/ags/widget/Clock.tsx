// ~/.config/ags/widget/Clock.tsx
import { Gtk } from "ags/gtk4"
import { createPoll } from "ags/time"
import { calendarVisible, setCalendarVisible, togglePopup } from "../app"

export default function Clock() {
  const time = createPoll("", 60000, ["date", "+%I:%M %p"])
  const date = createPoll("", 60000, ["date", "+%a %b %d"])

  return (
    <button class="clock-widget" onClicked={() => togglePopup(calendarVisible, setCalendarVisible)}>
      <box orientation={1} valign={Gtk.Align.CENTER} spacing={0}>
        <label class="clock-time" label={time} halign={Gtk.Align.CENTER} />
        <label class="clock-date" label={date} halign={Gtk.Align.CENTER} />
      </box>
    </button>
  )
}
