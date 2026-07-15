// ~/.config/ags/widget/Cmus.tsx
import Mpris from "gi://AstalMpris"
import { createBinding, createMemo, With } from "ags"
import { createPoll } from "ags/time"

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

const BROWSER_IDS = ["firefox", "chromium", "chrome", "brave", "vivaldi", "opera", "epiphany"]

function isMusicPlayer(player: Mpris.Player): boolean {
  const bus = (player.busName ?? "").toLowerCase()
  const entry = (player.entry ?? "").toLowerCase()
  return !BROWSER_IDS.some(b => bus.includes(b) || entry.includes(b))
}

function isMpd(player: Mpris.Player): boolean {
  const bus = (player.busName ?? "").toLowerCase()
  const entry = (player.entry ?? "").toLowerCase()
  return bus.includes("mpd") || entry.includes("mpd")
}

export default function Cmus() {
  const mpris = Mpris.get_default()
  const players = createBinding(mpris, "players")
  const musicPlayers = players.as(p =>
    p.filter(isMusicPlayer).sort((a, b) => Number(isMpd(b)) - Number(isMpd(a)))
  )

  return (
    <box class="cmus" visible={musicPlayers.as(p => p.length > 0)}>
      <With value={musicPlayers}>
        {(playerList) => {
          const player = playerList[0]
          if (!player) return null

          const title = createBinding(player, "title")
          const artist = createBinding(player, "artist")
          const length = createBinding(player, "length")
          const position = createPoll(player.position ?? 0, 1000, () => player.position ?? 0)

          const text = createMemo(() => {
            const a = artist() ?? ""
            const t = title() ?? ""
            const pos = formatTime(position())
            const len = formatTime(length() ?? 0)
            const label = a ? `${a} - ${t}` : t
            return `󰝚 ${label} [${pos}/${len}]`
          })

          return <label label={text} />
        }}
      </With>
    </box>
  )
}
