// ~/.config/ags/service/dictate.ts
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { createState } from "ags"

export type DictateState = "idle" | "recording" | "transcribing" | "error"

export const [dictateState, setDictateState] = createState<DictateState>("idle")

const SOCKET_PATH = "/tmp/dictate-vis.sock"
const STALE_TIMEOUT_MS = 5000
const ERROR_FLASH_MS = 1500

let staleTimer: number | null = null

function clearStaleTimer(): void {
  if (staleTimer !== null) {
    GLib.source_remove(staleTimer)
    staleTimer = null
  }
}

function armTimer(ms: number): void {
  clearStaleTimer()
  staleTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
    setDictateState("idle")
    staleTimer = null
    return GLib.SOURCE_REMOVE
  })
}

function handleMessage(line: string): void {
  let msg: { state?: string }
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }

  if (msg.state === "recording" || msg.state === "transcribing" || msg.state === "error" || msg.state === "idle") {
    setDictateState(msg.state)
  }

  if (msg.state === "idle") {
    clearStaleTimer()
  } else if (msg.state === "error") {
    // Daemon sends "error" as its terminal message (no follow-up "idle") — flash briefly then hide.
    armTimer(ERROR_FLASH_MS)
  } else {
    // Safety net: if dictate-daemon dies mid-recording/transcribing, don't leave the pill stuck.
    armTimer(STALE_TIMEOUT_MS)
  }
}

function readLoop(stream: Gio.DataInputStream): void {
  stream.read_line_async(GLib.PRIORITY_DEFAULT, null, (_self, res) => {
    let bytes: Uint8Array | null
    try {
      ;[bytes] = stream.read_line_finish(res)
    } catch (e) {
      console.error("dictate: read error", e)
      return
    }
    if (bytes === null) return // connection closed
    handleMessage(new TextDecoder().decode(bytes))
    readLoop(stream)
  })
}

function startServer(): void {
  const socketFile = Gio.File.new_for_path(SOCKET_PATH)
  try { socketFile.delete(null) } catch { /* no stale socket to clean up */ }

  const service = new Gio.SocketService()
  try {
    service.add_address(
      Gio.UnixSocketAddress.new(SOCKET_PATH),
      Gio.SocketType.STREAM,
      Gio.SocketProtocol.DEFAULT,
      null,
    )
  } catch (e) {
    console.error("dictate: failed to bind socket", e)
    return
  }

  service.connect("incoming", (_svc: Gio.SocketService, connection: Gio.SocketConnection) => {
    const stream = new Gio.DataInputStream({ base_stream: connection.get_input_stream() })
    readLoop(stream)
    return false
  })

  service.start()
}

startServer()
