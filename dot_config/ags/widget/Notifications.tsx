// ~/.config/ags/widget/Notifications.tsx
import { notifHistoryVisible, setNotifHistoryVisible, togglePopup } from "../app"
import { history } from "../service/notifications"

export default function Notifications() {
  return (
    <box visible={history.as(h => h.length > 0)}>
      <button class="notifications" onClicked={() => togglePopup(notifHistoryVisible, setNotifHistoryVisible)}>
        <label label={history.as(h => `󰂚 ${h.length}`)} />
      </button>
      <box class="bar-divider" />
    </box>
  )
}
