// ~/.config/ags/service/todos.ts
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { createState } from "ags"
import { interval } from "ags/time"

export const TODOS_DIR = `${GLib.get_home_dir()}/.local/share/ags/todos`

export interface TodoItem {
  text: string
  done: boolean
}

export interface RecurringItem {
  text: string
  days: string[]  // subset of ["M","T","W","R","F","S","U"]
}

// M=Mon T=Tue W=Wed R=Thu F=Fri S=Sat U=Sun
const DAY_LETTERS = ["U", "M", "T", "W", "R", "F", "S"]
const DAY_NAMES   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
export const ALL_DAY_LETTERS = ["M", "T", "W", "R", "F", "S", "U"]

function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}

export function today(): string {
  return localDateString(new Date())
}

export function getDayLetter(date: string): string {
  return DAY_LETTERS[new Date(date + "T12:00:00").getDay()]
}

export function getDayName(date: string): string {
  return DAY_NAMES[new Date(date + "T12:00:00").getDay()]
}

// Returns [Mon, Tue, Wed, Thu, Fri, Sat, Sun] dates for the current week
export function getCurrentWeekDates(): string[] {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return localDateString(d)
  })
}

// ── File helpers ──────────────────────────────────────────────────────────────

function readFileSync(path: string): string | null {
  try {
    const file = Gio.File.new_for_path(path)
    const [ok, contents] = file.load_contents(null)
    if (!ok || !contents) return null
    return new TextDecoder().decode(contents as Uint8Array)
  } catch {
    return null
  }
}

function writeFileSync(path: string, content: string): void {
  try {
    const file = Gio.File.new_for_path(path)
    const parent = file.get_parent()
    if (parent) {
      try { parent.make_directory_with_parents(null) } catch (_) { /* exists */ }
    }
    file.replace_contents(
      new TextEncoder().encode(content),
      null, false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null
    )
  } catch (e) {
    console.error(`todos: failed to write ${path}:`, e)
  }
}

// ── Daily todos ───────────────────────────────────────────────────────────────

export function parseTodos(content: string): TodoItem[] {
  return content.split("\n")
    .filter(line => /^\[[ x]\] /.test(line))
    .map(line => ({
      done: line.startsWith("[x]"),
      text: line.slice(4).trim(),
    }))
}

export function formatTodos(items: TodoItem[]): string {
  return items.map(i => `${i.done ? "[x]" : "[ ]"} ${i.text}`).join("\n")
}

export function getTodosForDate(date: string): TodoItem[] {
  const content = readFileSync(`${TODOS_DIR}/${date}.txt`)
  return content !== null ? parseTodos(content) : []
}

export function saveTodosForDate(date: string, items: TodoItem[]): void {
  writeFileSync(`${TODOS_DIR}/${date}.txt`, formatTodos(items))
}

// ── Recurring todos ───────────────────────────────────────────────────────────

export function parseRecurring(content: string): RecurringItem[] {
  return content.split("\n")
    .filter(line => /^[MTWRFSU]+ \[ \] .+/.test(line))
    .map(line => {
      const spaceIdx = line.indexOf(" ")
      return {
        days: line.slice(0, spaceIdx).split(""),
        text: line.slice(spaceIdx + 5).trim(),  // skip " [ ] "
      }
    })
}

export function formatRecurring(items: RecurringItem[]): string {
  return items.map(i => `${i.days.join("")} [ ] ${i.text}`).join("\n")
}

export function getRecurring(): RecurringItem[] {
  const content = readFileSync(`${TODOS_DIR}/recurring.txt`)
  return content !== null ? parseRecurring(content) : []
}

export function saveRecurring(items: RecurringItem[]): void {
  writeFileSync(`${TODOS_DIR}/recurring.txt`, formatRecurring(items))
}

// ── File existence check ──────────────────────────────────────────────────────

export function hasTodosFile(date: string): boolean {
  return Gio.File.new_for_path(`${TODOS_DIR}/${date}.txt`).query_exists(null)
}

// ── Day initialization ────────────────────────────────────────────────────────

export function initDayIfNeeded(date: string): void {
  const path = `${TODOS_DIR}/${date}.txt`
  if (readFileSync(path) !== null) return
  const letter = getDayLetter(date)
  const injected = getRecurring()
    .filter(r => r.days.includes(letter))
    .map(r => ({ text: r.text, done: false }))
  saveTodosForDate(date, injected)
}

// ── Badge count (used by TodoButton) ─────────────────────────────────────────

const todoCountState = createState(0)
export const todayCount = todoCountState[0]
const setTodayCount = todoCountState[1]

export function refreshBadge(): void {
  const date = today()
  initDayIfNeeded(date)
  const content = readFileSync(`${TODOS_DIR}/${date}.txt`)
  setTodayCount(content !== null ? parseTodos(content).filter(i => !i.done).length : 0)
}

refreshBadge()
interval(5000, refreshBadge)
