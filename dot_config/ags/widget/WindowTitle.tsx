// ~/.config/ags/widget/WindowTitle.tsx
import Hyprland from "gi://AstalHyprland"
import { createBinding } from "ags"

export default function WindowTitle() {
  const hypr = Hyprland.get_default()

  return (
    <label
      class="window-title"
      ellipsize={3}
      maxWidthChars={75}
      label={createBinding(hypr, "focusedClient").as(client => client?.title ?? "")}
    />
  )
}
