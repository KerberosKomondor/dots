// ~/.config/ags/widget/DashboardButton.tsx
import { dashboardVisible, setDashboardVisible, togglePopup } from "../app"

export default function DashboardButton() {
  return (
    <button
      class="dashboard-button"
      onClicked={() => togglePopup(dashboardVisible, setDashboardVisible)}
    >
      <label label="󰣇" />
    </button>
  )
}
