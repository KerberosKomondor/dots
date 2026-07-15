// ~/.config/ags/widget/WeatherPopup.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { With } from "ags"
import { weather, WMO_ICON, WMO_DESC } from "../service/weather"
import { weatherVisible, setWeatherVisible } from "../app"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today"
  const d = new Date(dateStr + "T12:00:00")
  return DAYS[d.getDay()]
}

export default function WeatherPopup(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor

  return (
    <window
      class="WeatherPopup"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={weatherVisible as unknown as boolean}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setWeatherVisible(false)
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
            setWeatherVisible(false)
          }
        })
        self.add_controller(click)
      }}
    >
      <box class="weather-popup" orientation={1} halign={Gtk.Align.END} valign={Gtk.Align.START}>
        <With value={weather}>
          {(w) => {
            if (!w) return null
            return (
              <box orientation={1} spacing={0}>
                <box class="weather-current" spacing={12}>
                  <label class="weather-icon" label={WMO_ICON[w.weatherCode] ?? "󰖐"} />
                  <box orientation={1}>
                    <label class="weather-temp" label={`${w.temperature}°F`} halign={Gtk.Align.START} />
                    <label class="weather-desc" label={`${WMO_DESC[w.weatherCode] ?? "Unknown"} · Colorado Springs`} halign={Gtk.Align.START} />
                    <box class="weather-meta" spacing={6}>
                      <label label={`󰔏 ${w.apparentTemperature}°F`} />
                      <label label="·" class="weather-sep" />
                      <label label={`󰖝 ${w.windSpeed} mph`} />
                      <label label="·" class="weather-sep" />
                      <label label={`󰖐 ${w.humidity}%`} />
                    </box>
                  </box>
                </box>
                <label class="weather-forecast-label" label="NEXT 12 HOURS" halign={Gtk.Align.START} />
                <box class="weather-hourly" orientation={1} spacing={0}>
                  {(() => {
                    if (w.hourly.length === 0) return null
                    const temps = w.hourly.map(h => h.temperature)
                    const minTemp = Math.min(...temps)
                    const maxTemp = Math.max(...temps)
                    const range = maxTemp - minTemp || 1
                    return w.hourly.map((h, i) => {
                      const pct = (h.temperature - minTemp) / range
                      const barPx = Math.max(2, Math.round(pct * 120))
                      const hasRain = h.precipitationProbability >= 20
                      const barColor = hasRain ? "#bd93f9" : "#8be9fd"
                      const timeLabel = i === 0
                        ? "Now"
                        : (() => {
                            const hr = new Date(h.time).getHours()
                            return `${hr % 12 || 12} ${hr < 12 ? "AM" : "PM"}`
                          })()
                      return (
                        <box class="hourly-row" spacing={8}>
                          <label class="hourly-time" label={timeLabel} halign={Gtk.Align.START} />
                          <label class="hourly-icon" label={WMO_ICON[h.weatherCode] ?? "󰖐"} halign={Gtk.Align.CENTER} />
                          <box class="hourly-bar-wrap" hexpand={true}>
                            <box
                              class="hourly-bar"
                              halign={Gtk.Align.START}
                              valign={Gtk.Align.FILL}
                              widthRequest={barPx}
                              css={`background: ${barColor};`}
                            />
                          </box>
                          <label class="hourly-temp" label={`${h.temperature}°`} halign={Gtk.Align.END} />
                          <label
                            class="hourly-precip"
                            label={hasRain ? `${h.precipitationProbability}%` : ""}
                            halign={Gtk.Align.END}
                          />
                        </box>
                      )
                    })
                  })()}
                </box>
                <label class="weather-forecast-label" label="5-DAY FORECAST" halign={Gtk.Align.START} />
                <box class="weather-forecast" spacing={6} homogeneous>
                  {w.forecast.map((day, i) => (
                    <box class="forecast-day" orientation={1} spacing={4}>
                      <label class="forecast-name" label={dayLabel(day.date, i)} />
                      <label class="forecast-icon" label={WMO_ICON[day.weatherCode] ?? "󰖐"} />
                      <label class="forecast-hi" label={`${day.maxTemp}°`} />
                      <label class="forecast-lo" label={`${day.minTemp}°`} />
                    </box>
                  ))}
                </box>
              </box>
            )
          }}
        </With>
      </box>
    </window>
  )
}
