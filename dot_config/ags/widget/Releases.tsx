// ~/.config/ags/widget/Releases.tsx
import { Gtk } from "ags/gtk4"
import { releasesVisible, setReleasesVisible, togglePopup } from "../app"
import { releases } from "../service/releases"

// Hidden unless Sonarr/Radarr/Lidarr have a monitored release today
export default function Releases() {
  return (
    <overlay visible={releases.as(r => r.length > 0)}>
      <button class="releases-btn" onClicked={() => togglePopup(releasesVisible, setReleasesVisible)}>
        <label class="releases-icon" label={""} />
      </button>
      <label
        $type="overlay"
        class="releases-badge"
        halign={Gtk.Align.END}
        valign={Gtk.Align.START}
        label={releases.as(r => String(r.length))}
      />
    </overlay>
  )
}
