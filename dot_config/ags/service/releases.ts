// ~/.config/ags/service/releases.ts
// Polls Sonarr / Radarr / Lidarr calendars for monitored items releasing today (local date).
// URLs + API keys live in ~/.local/share/ags/arr.env (untracked, chmod 600) — NOT in chezmoi.
import { createState } from "ags"
import { execAsync } from "ags/process"
import { interval } from "ags/time"
import GLib from "gi://GLib"

export type ReleaseKind = "episode" | "movie" | "album"

export interface Release {
  kind: ReleaseKind
  title: string      // series / movie / artist
  subtitle: string   // "S03E01 · Episode title" / "Digital release" / album title
  time: string       // local "8:00 PM" for episodes, "" otherwise
  downloaded: boolean
}

const ENV_PATH = `${GLib.get_home_dir()}/.local/share/ags/arr.env`

function readEnv(): Record<string, string> {
  try {
    const [ok, bytes] = GLib.file_get_contents(ENV_PATH)
    if (!ok) return {}
    const env: Record<string, string> = {}
    for (const line of new TextDecoder().decode(bytes).split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim()
    }
    return env
  } catch (e) {
    console.error(`releases: cannot read ${ENV_PATH}:`, e)
    return {}
  }
}

const pad = (n: number) => String(n).padStart(2, "0")
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

async function getJson(base: string, key: string, path: string): Promise<any[]> {
  const out = await execAsync(["curl", "-sf", "--max-time", "10", "-H", `X-Api-Key: ${key}`, `${base}${path}`])
  return JSON.parse(out)
}

// Query yesterday..tomorrow so UTC offsets can't drop today's items, then filter by local date
function range(today: string): string {
  const now = new Date(`${today}T12:00:00`)
  const y = new Date(now.getTime() - 86400000)
  const t = new Date(now.getTime() + 86400000)
  return `start=${localDate(y)}&end=${localDate(t)}`
}

async function sonarr(env: Record<string, string>, today: string): Promise<Release[]> {
  if (!env.SONARR_URL || !env.SONARR_KEY) return []
  const eps = await getJson(env.SONARR_URL, env.SONARR_KEY, `/api/v3/calendar?${range(today)}&includeSeries=true`)
  return eps
    .filter(e => e.monitored && e.airDateUtc && localDate(new Date(e.airDateUtc)) === today)
    .map(e => {
      const at = new Date(e.airDateUtc)
      return {
        kind: "episode" as const,
        title: e.series?.title ?? "Unknown series",
        subtitle: `S${pad(e.seasonNumber)}E${pad(e.episodeNumber)} · ${e.title ?? "TBA"}`,
        time: at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        downloaded: !!e.hasFile,
      }
    })
}

async function radarr(env: Record<string, string>, today: string): Promise<Release[]> {
  if (!env.RADARR_URL || !env.RADARR_KEY) return []
  const movies = await getJson(env.RADARR_URL, env.RADARR_KEY, `/api/v3/calendar?${range(today)}`)
  const kinds: [string, string][] = [["digitalRelease", "Digital"], ["physicalRelease", "Physical"], ["inCinemas", "In cinemas"]]
  const out: Release[] = []
  for (const m of movies) {
    if (!m.monitored) continue
    // Release dates are date-only values serialized as T00:00:00Z — compare the date part directly
    const hit = kinds.filter(([k]) => typeof m[k] === "string" && m[k].slice(0, 10) === today)
    if (hit.length === 0) continue
    out.push({
      kind: "movie",
      title: m.year ? `${m.title} (${m.year})` : m.title,
      subtitle: hit.map(([, label]) => label).join(" + ") + " release",
      time: "",
      downloaded: !!m.hasFile,
    })
  }
  return out
}

async function lidarr(env: Record<string, string>, today: string): Promise<Release[]> {
  if (!env.LIDARR_URL || !env.LIDARR_KEY) return []
  const albums = await getJson(env.LIDARR_URL, env.LIDARR_KEY, `/api/v1/calendar?${range(today)}&includeArtist=true`)
  return albums
    .filter(a => a.monitored && typeof a.releaseDate === "string" && a.releaseDate.slice(0, 10) === today)
    .map(a => {
      const s = a.statistics ?? {}
      return {
        kind: "album" as const,
        title: a.artist?.artistName ?? "Unknown artist",
        subtitle: a.title,
        time: "",
        downloaded: (s.totalTrackCount ?? 0) > 0 && s.trackFileCount >= s.totalTrackCount,
      }
    })
}

export const [releases, setReleases] = createState<Release[]>([])

export async function refreshReleases(): Promise<void> {
  const env = readEnv()
  // RELEASES_TEST_DATE=YYYY-MM-DD in arr.env pins "today" for debugging the popup
  const today = env.RELEASES_TEST_DATE || localDate(new Date())
  const results = await Promise.allSettled([sonarr(env, today), radarr(env, today), lidarr(env, today)])
  const names = ["sonarr", "radarr", "lidarr"]
  const all: Release[] = []
  results.forEach((r, i) => {
    if (r.status === "fulfilled") all.push(...r.value)
    else console.error(`releases: ${names[i]} fetch failed:`, r.reason)
  })
  const order: Record<ReleaseKind, number> = { episode: 0, movie: 1, album: 2 }
  all.sort((a, b) => order[a.kind] - order[b.kind] || a.title.localeCompare(b.title))
  setReleases(all)
}

// Fetch now, then every 15 minutes (also re-filters by date, so midnight rollover self-corrects)
refreshReleases()
interval(900000, () => refreshReleases())
