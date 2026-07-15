// ~/.config/ags/service/notifications.ts
import Notifd from "gi://AstalNotifd"
import GdkPixbuf from "gi://GdkPixbuf"
import { createState } from "ags"

export const notifd = Notifd.get_default()

export const MAX_VISIBLE = 5

export interface PopupGroup {
  appName: string
  notif: Notifd.Notification // currently displayed (latest)
  count: number              // total notifs folded into this group
}

export const [popupStack, setPopupStack] = createState<PopupGroup[]>([])
export const [overflowCount, setOverflowCount] = createState(0)
export const [history, setHistory] = createState<Notifd.Notification[]>([])

export function urgencyClass(notif: Notifd.Notification): string {
  switch (notif.urgency) {
    case Notifd.Urgency.LOW: return "low"
    case Notifd.Urgency.CRITICAL: return "critical"
    default: return "normal"
  }
}

// GTK4 Gtk.Image's pixel-size property only applies to icon-name images, not
// file-based ones — a file-based image renders at its native size. App icons
// like kitty's 256x256 logo would dwarf the notification text, so file-based
// icons are pre-scaled to a pixbuf instead.
export function notifIcon(notif: Notifd.Notification, size = 32): { pixbuf?: GdkPixbuf.Pixbuf; iconName?: string } {
  const image = notif.get_image()
  const appIcon = notif.get_app_icon()
  const path = image?.startsWith("/") ? image : appIcon?.startsWith("/") ? appIcon : null
  if (path) {
    try {
      return { pixbuf: GdkPixbuf.Pixbuf.new_from_file_at_size(path, size, size) }
    } catch (e) {
      console.warn(`notifIcon: failed to load "${path}"`, e)
    }
  }
  const name = image && !image.startsWith("/") ? image : appIcon && !appIcon.startsWith("/") ? appIcon : null
  return { iconName: name ?? "dialog-information-symbolic" }
}

const MAX_PREVIEW_PX = 128

function scalePreview(pixbuf: GdkPixbuf.Pixbuf): GdkPixbuf.Pixbuf {
  const w = pixbuf.get_width()
  const h = pixbuf.get_height()
  if (w <= MAX_PREVIEW_PX && h <= MAX_PREVIEW_PX) return pixbuf
  const scale = MAX_PREVIEW_PX / Math.max(w, h)
  return pixbuf.scale_simple(Math.round(w * scale), Math.round(h * scale), GdkPixbuf.InterpType.BILINEAR) ?? pixbuf
}

function decodeImagePixbuf(notif: Notifd.Notification): GdkPixbuf.Pixbuf | null {
  for (const key of ["image-data", "image_data", "icon_data"]) {
    const v = notif.get_hint(key)
    if (!v) continue
    try {
      const [w, h, rowstride, hasAlpha, bps, _channels, data] =
        v.deep_unpack<[number, number, number, boolean, number, number, Uint8Array]>()
      return scalePreview(GdkPixbuf.Pixbuf.new_from_bytes(data, GdkPixbuf.Colorspace.RGB, hasAlpha, bps, w, h, rowstride))
    } catch (e) {
      console.warn(`notifImagePixbuf: failed to decode hint "${key}"`, e)
      continue
    }
  }

  // astal-notifd normalizes "image-data" into a cached PNG exposed via the
  // "image-path" hint (notifIcon() also shows this as the small icon — a
  // larger preview here is intentionally redundant with it).
  for (const key of ["image-path", "image_path"]) {
    const v = notif.get_hint(key)
    if (!v) continue
    const path = v.deep_unpack<string>()
    if (!path) continue
    try {
      return scalePreview(GdkPixbuf.Pixbuf.new_from_file(path))
    } catch (e) {
      console.warn(`notifImagePixbuf: failed to load hint "${key}"`, e)
      continue
    }
  }

  return null
}

// Cached by notification id — both popup and history rows call this, and
// NotificationHistory re-renders its whole list on every history change.
const imagePreviewCache = new Map<number, GdkPixbuf.Pixbuf | null>()

// Decodes the standard "image-data" hint (raw pixbuf bytes), e.g. inline
// photo/screenshot previews from Teams. Falls back through legacy hint
// names. Returns null if no decodable image is present.
export function notifImagePixbuf(notif: Notifd.Notification): GdkPixbuf.Pixbuf | null {
  const cached = imagePreviewCache.get(notif.id)
  if (cached !== undefined) return cached

  const pixbuf = decodeImagePixbuf(notif)
  imagePreviewCache.set(notif.id, pixbuf)
  return pixbuf
}

export function dismissPopup(notif: Notifd.Notification): void {
  notif.dismiss()
}

export function clearHistory(): void {
  imagePreviewCache.clear()
  setHistory([])
}

export function removeFromHistory(id: number): void {
  imagePreviewCache.delete(id)
  setHistory(h => h.filter(n => n.id !== id))
}

export function invokeAction(notif: Notifd.Notification, actionId: string): void {
  notif.invoke(actionId)
}

// --- Auto-dismiss timers ---
// low: 8s, normal: 10s, critical: never (matches the old mako config)

const URGENCY_TIMEOUT_MS: Record<number, number | null> = {
  [Notifd.Urgency.LOW]: 8000,
  [Notifd.Urgency.NORMAL]: 10000,
  [Notifd.Urgency.CRITICAL]: null,
}

interface TimerState {
  sourceId: number | null
  total: number | null   // null = critical, never expires
  runRemaining: number   // ms remaining at the start of the current run (or when paused)
  startedAt: number      // Date.now() when the current run started
}

const timers = new Map<number, TimerState>()

function scheduleRun(id: number, remainingMs: number, total: number | null): void {
  const sourceId = setTimeout(() => {
    const notif = notifd.get_notification(id)
    if (notif) notif.dismiss()
  }, remainingMs)
  timers.set(id, { sourceId, total, runRemaining: remainingMs, startedAt: Date.now() })
}

function startTimer(id: number, urgency: Notifd.Urgency): void {
  const total = urgency in URGENCY_TIMEOUT_MS ? URGENCY_TIMEOUT_MS[urgency] : 10000
  if (total === null) {
    timers.set(id, { sourceId: null, total: null, runRemaining: 0, startedAt: 0 })
    return
  }
  scheduleRun(id, total, total)
}

function clearTimer(id: number): void {
  const t = timers.get(id)
  if (t?.sourceId !== null && t?.sourceId !== undefined) clearTimeout(t.sourceId)
  timers.delete(id)
}

export function pauseTimer(id: number): void {
  const t = timers.get(id)
  if (!t || t.sourceId === null) return
  clearTimeout(t.sourceId)
  const elapsed = Date.now() - t.startedAt
  const remaining = Math.max(0, t.runRemaining - elapsed)
  timers.set(id, { ...t, sourceId: null, runRemaining: remaining })
}

export function resumeTimer(id: number): void {
  const t = timers.get(id)
  if (!t || t.total === null || t.sourceId !== null) return
  scheduleRun(id, t.runRemaining, t.total)
}

// Fraction of time remaining (0-1), or null if the notification never expires
export function getTimerFraction(id: number): number | null {
  const t = timers.get(id)
  if (!t || t.total === null) return null
  if (t.sourceId === null) return t.runRemaining / t.total
  const elapsed = Date.now() - t.startedAt
  return Math.max(0, t.runRemaining - elapsed) / t.total
}

notifd.connect("notified", (_src, id: number) => {
  const notif = notifd.get_notification(id)
  if (!notif) return

  setHistory(h => [notif, ...h])

  if (notifd.dontDisturb) return

  setPopupStack(stack => {
    const idx = stack.findIndex(g => g.appName === notif.app_name)
    if (idx !== -1) {
      clearTimer(stack[idx].notif.id)
      const next = [...stack]
      next[idx] = { appName: notif.app_name, notif, count: stack[idx].count + 1 }
      return next
    }

    let next = stack
    if (stack.length >= MAX_VISIBLE) {
      const dropped = stack[0]
      clearTimer(dropped.notif.id)
      setOverflowCount(n => n + dropped.count)
      next = stack.slice(1)
    }
    return [...next, { appName: notif.app_name, notif, count: 1 }]
  })

  startTimer(id, notif.urgency)
})

notifd.connect("resolved", (_src, id: number) => {
  clearTimer(id)
  setPopupStack(stack => {
    const next = stack.filter(g => g.notif.id !== id)
    if (next.length === 0) setOverflowCount(0)
    return next
  })
})
