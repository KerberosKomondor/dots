// ~/.config/ags/widget/Workspaces.tsx
import { Gtk } from "ags/gtk4"
import Hyprland from "gi://AstalHyprland"
import { createBinding, createMemo, For } from "ags"

export default function Workspaces() {
  const hypr = Hyprland.get_default()
  const workspaces = createBinding(hypr, "workspaces")
  const focusedWs = createBinding(hypr, "focusedWorkspace")

  // Sorted list of workspace IDs, always including the focused one
  const wsIds = createMemo(() => {
    const wsList = workspaces()
    const fw = focusedWs()
    return [...new Set([...wsList.map((w: {id: number}) => w.id), fw?.id ?? 1])]
      .sort((a: number, b: number) => a - b)
  })

  return (
    <box class="workspaces" spacing={5} valign={Gtk.Align.CENTER}>
      <For each={wsIds} id={(id: number) => id}>
        {(id: number) => (
          <box
            valign={Gtk.Align.CENTER}
            class={createMemo(() => {
              const fw = focusedWs()
              const wsList = workspaces()
              return fw?.id === id
                ? "ws-dot active"
                : wsList.some((w: {id: number}) => w.id === id)
                  ? "ws-dot occupied"
                  : "ws-dot"
            })}
          />
        )}
      </For>
    </box>
  )
}
