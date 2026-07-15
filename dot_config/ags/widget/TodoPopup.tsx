// ~/.config/ags/widget/TodoPopup.tsx
import { Astal, Gtk, Gdk } from "ags/gtk4"
import app from "ags/gtk4/app"
import { createState, With } from "ags"
import { todoVisible, setTodoVisible } from "../app"
import {
  TodoItem, getCurrentWeekDates, today, getDayName, getDayLetter,
  getTodosForDate, saveTodosForDate, initDayIfNeeded, refreshBadge,
  getRecurring, saveRecurring, hasTodosFile, ALL_DAY_LETTERS,
} from "../service/todos"

export default function TodoPopup(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT, BOTTOM, RIGHT } = Astal.WindowAnchor
  const [weekInfo, setWeekInfo] = createState({ weekDates: getCurrentWeekDates(), todayStr: today() })

  const [selectedDate, setSelectedDate] = createState(today())
  const [items, setItems] = createState<TodoItem[]>([])
  const [showAdd, setShowAdd] = createState(false)
  const [addMode, setAddMode] = createState<"oneoff" | "recurring">("oneoff")
  const [selectedDays, setSelectedDays] = createState<string[]>([getDayLetter(today())])
  const [addText, setAddText] = createState("")

  function loadDay(date: string): void {
    initDayIfNeeded(date)
    setItems(getTodosForDate(date))
    setShowAdd(false)
  }

  function toggleItem(text: string): void {
    const date = selectedDate()
    const current = getTodosForDate(date)
    const idx = current.findIndex(it => it.text === text)
    if (idx === -1) return
    current[idx].done = !current[idx].done
    saveTodosForDate(date, current)
    setItems([...current])
    refreshBadge()
  }

  function deleteItem(text: string): void {
    const date = selectedDate()
    const current = getTodosForDate(date)
    const updated = current.filter(it => it.text !== text)
    saveTodosForDate(date, updated)
    setItems(updated)
    refreshBadge()
  }

  function toggleDaySelection(letter: string): void {
    const current = selectedDays()
    const next = current.includes(letter)
      ? current.filter(l => l !== letter)
      : [...current, letter]
    setSelectedDays(next)
  }

  function handleAdd(text: string): void {
    if (!text.trim()) return
    const days = selectedDays()
    if (days.length === 0) return
    const { weekDates } = weekInfo()

    if (addMode() === "oneoff") {
      for (const date of weekDates) {
        if (days.includes(getDayLetter(date))) {
          initDayIfNeeded(date)
          const current = getTodosForDate(date)
          saveTodosForDate(date, [...current, { text: text.trim(), done: false }])
        }
      }
    } else {
      const current = getRecurring()
      saveRecurring([...current, { text: text.trim(), days }])
      for (const date of weekDates) {
        if (days.includes(getDayLetter(date))) {
          if (hasTodosFile(date)) {
            const content = getTodosForDate(date)
            saveTodosForDate(date, [...content, { text: text.trim(), done: false }])
          }
        }
      }
    }

    setItems(getTodosForDate(selectedDate()))
    refreshBadge()
    setShowAdd(false)
    setAddMode("oneoff")
    setSelectedDays([getDayLetter(selectedDate())])
  }

  // Load today on first open, and reset to today/this week each time popup opens
  loadDay(today())
  todoVisible.subscribe(() => {
    if (todoVisible()) {
      const nowToday = today()
      setWeekInfo({ weekDates: getCurrentWeekDates(), todayStr: nowToday })
      setSelectedDate(nowToday)
      loadDay(nowToday)
    }
  })

  return (
    <window
      class="TodoPopup"
      gdkmonitor={gdkmonitor}
      layer={Astal.Layer.OVERLAY}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={TOP | LEFT | BOTTOM | RIGHT}
      visible={todoVisible.as(v => v)}
      application={app}
      $={(self: any) => {
        const ctrl = new Gtk.EventControllerKey()
        ctrl.connect("key-pressed", (_c: any, keyval: number) => {
          if (keyval === Gdk.KEY_Escape) setTodoVisible(false)
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
            setTodoVisible(false)
          }
        })
        self.add_controller(click)
      }}
    >
      <box class="todo-popup" orientation={1} spacing={0} halign={Gtk.Align.START} valign={Gtk.Align.START}>

        {/* Day tabs — re-rendered via <With> when weekInfo changes (popup reopened in a new week) */}
        <With value={weekInfo}>
          {({ weekDates, todayStr }: { weekDates: string[]; todayStr: string }) => (
            <box class="todo-tabs" spacing={2}>
              {weekDates.map(date => {
                const hasItems = getTodosForDate(date).length > 0
                const isToday = date === todayStr
                return (
                  <button
                    class={selectedDate.as((active: string) => {
                      let cls = "todo-tab"
                      if (date === active) cls += " active"
                      else if (hasItems) cls += " has-items"
                      else if (isToday) cls += " today"
                      return cls
                    })}
                    onClicked={() => {
                      setSelectedDate(date)
                      loadDay(date)
                    }}
                  >
                    <label label={getDayName(date)} />
                  </button>
                )
              })}
            </box>
          )}
        </With>

        <box class="todo-divider" />

        {/* Item list — stable wrapper prevents <With> re-appending after siblings */}
        <box orientation={1}>
          <With value={items}>
            {(list: TodoItem[]) => (
              <box orientation={1} spacing={2} class="todo-list">
                {list.length === 0
                  ? <label class="todo-empty" label="Nothing here" halign={Gtk.Align.CENTER} />
                  : list.map((item, i) => (
                      <box class={`todo-item${item.done ? " done" : ""}`} spacing={4}>
                        <button class="todo-check" onClicked={() => toggleItem(item.text)}>
                          <overlay>
                            <label label="󰄱" />
                            {item.done && (
                              <label
                                $type="overlay"
                                class="todo-checkmark"
                                label="󰄬"
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                              />
                            )}
                          </overlay>
                        </button>
                        <label class="todo-text" label={item.text} hexpand halign={Gtk.Align.START} />
                        <button class="todo-delete" onClicked={() => deleteItem(item.text)}>
                          <label label="󰅖" />
                        </button>
                      </box>
                    ))
                }
              </box>
            )}
          </With>
        </box>

        {/* Add button / form */}
        <With value={showAdd}>
          {(adding: boolean) => adding ? (
            <box orientation={1} class="todo-add-form" spacing={6}>
              <entry
                class="todo-add-entry"
                placeholder_text="What needs doing?"
                onChanged={(self: any) => setAddText(self.text)}
                onActivate={(self: any) => {
                  handleAdd(self.text)
                  self.set_text("")
                  setAddText("")
                }}
              />
              <With value={addMode}>
                {(mode: "oneoff" | "recurring") => (
                  <box orientation={1} spacing={4}>
                    <box spacing={4}>
                      <button
                        class={`todo-mode-btn${mode === "oneoff" ? " active" : ""}`}
                        onClicked={() => { setAddMode("oneoff"); setSelectedDays([getDayLetter(selectedDate())]) }}
                      >
                        <label label="One-off" />
                      </button>
                      <button
                        class={`todo-mode-btn${mode === "recurring" ? " active" : ""}`}
                        onClicked={() => { setAddMode("recurring"); setSelectedDays([]) }}
                      >
                        <label label="Recurring" />
                      </button>
                    </box>
                    <With value={selectedDays}>
                      {(days: string[]) => (
                        <box class="todo-day-picker" spacing={3}>
                          {mode === "oneoff"
                            ? weekInfo().weekDates.map(date => {
                                const letter = getDayLetter(date)
                                return (
                                  <button
                                    class={`todo-day-btn${days.includes(letter) ? " active" : ""}`}
                                    onClicked={() => toggleDaySelection(letter)}
                                  >
                                    <label label={getDayName(date).slice(0, 2)} />
                                  </button>
                                )
                              })
                            : ALL_DAY_LETTERS.map(letter => (
                                <button
                                  class={`todo-day-btn${days.includes(letter) ? " active" : ""}`}
                                  onClicked={() => toggleDaySelection(letter)}
                                >
                                  <label label={letter} />
                                </button>
                              ))
                          }
                        </box>
                      )}
                    </With>
                    <box spacing={4}>
                      <button
                        class="todo-save-btn"
                        onClicked={() => { handleAdd(addText()); setAddText("") }}
                      >
                        <label label="Add" />
                      </button>
                      <button class="todo-cancel-btn" onClicked={() => setShowAdd(false)}>
                        <label label="Cancel" />
                      </button>
                    </box>
                  </box>
                )}
              </With>
            </box>
          ) : (
            <button class="todo-add-btn" onClicked={() => setShowAdd(true)}>
              <label label="󰐕" />
            </button>
          )}
        </With>

      </box>
    </window>
  )
}
