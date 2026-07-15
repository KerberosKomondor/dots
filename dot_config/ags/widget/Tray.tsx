// ~/.config/ags/widget/Tray.tsx
import { Gdk, Gtk } from "ags/gtk4"
import AstalTray from "gi://AstalTray"
import { createBinding, For, onCleanup } from "ags"

export default function Tray() {
  const tray = AstalTray.get_default()

  return (
    <box class="tray" spacing={4}>
      <For each={createBinding(tray, "items")}>
        {(item) => {
          let popover: Gtk.PopoverMenu | null = null

          const rebuildPopover = (self: Gtk.Widget) => {
            if (popover) {
              popover.unparent()
              popover = null
            }
            if (!item.menuModel) return
            popover = Gtk.PopoverMenu.new_from_model(item.menuModel)
            popover.add_css_class("tray-menu")
            popover.set_parent(self)
            if (item.actionGroup)
              popover.insert_action_group("dbusmenu", item.actionGroup)
          }

          return (
            <button
              class="tray-item"
              tooltipMarkup={createBinding(item, "tooltipMarkup")}
              $={(self: Gtk.Button) => {
                rebuildPopover(self)
                const disposeMenu = createBinding(item, "menuModel").subscribe(() => rebuildPopover(self))
                const disposeActions = createBinding(item, "actionGroup").subscribe(() => rebuildPopover(self))
                onCleanup(() => {
                  disposeMenu()
                  disposeActions()
                  popover?.unparent()
                })
              }}
            >
              <Gtk.GestureClick
                button={Gdk.BUTTON_PRIMARY}
                onPressed={(_self, _n, x, y) => item.activate(x, y)}
              />
              <Gtk.GestureClick
                button={Gdk.BUTTON_SECONDARY}
                onPressed={() => {
                  item.about_to_show()
                  popover?.popup()
                }}
              />
              <image gicon={createBinding(item, "gicon")} />
            </button>
          )
        }}
      </For>
    </box>
  )
}
