// ~/.config/ags/service/audio.ts
import Wp from "gi://AstalWp"
import { createState } from "ags"

const audio = Wp.get_default()!.audio

export const [speakers, setSpeakers] = createState<Wp.Endpoint[]>(audio.get_speakers() ?? [])
export const [microphones, setMicrophones] = createState<Wp.Endpoint[]>(audio.get_microphones() ?? [])
export const [streams, setStreams] = createState<Wp.Stream[]>(audio.get_streams() ?? [])

audio.connect("speaker-added", (_a, e) => setSpeakers((s) => [...s, e]))
audio.connect("speaker-removed", (_a, e) => setSpeakers((s) => s.filter((x) => x.id !== e.id)))
audio.connect("microphone-added", (_a, e) => setMicrophones((s) => [...s, e]))
audio.connect("microphone-removed", (_a, e) => setMicrophones((s) => s.filter((x) => x.id !== e.id)))
audio.connect("stream-added", (_a, e) => setStreams((s) => [...s, e]))
audio.connect("stream-removed", (_a, e) => setStreams((s) => s.filter((x) => x.id !== e.id)))

export const [defaultSpeakerVolume, setDefaultSpeakerVolume] = createState(audio.get_default_speaker()?.volume ?? 0)
export const [defaultSpeakerMute, setDefaultSpeakerMute] = createState(audio.get_default_speaker()?.mute ?? true)
export const [defaultMicVolume, setDefaultMicVolume] = createState(audio.get_default_microphone()?.volume ?? 0)
export const [defaultMicMute, setDefaultMicMute] = createState(audio.get_default_microphone()?.mute ?? true)

let lastSpeaker: Wp.Endpoint | null = null
let lastSpeakerHandlers: number[] = []

function trackDefaultSpeaker(spk: Wp.Endpoint | null) {
  if (lastSpeaker) for (const id of lastSpeakerHandlers) lastSpeaker.disconnect(id)
  lastSpeakerHandlers = []
  lastSpeaker = spk

  if (!spk) {
    setDefaultSpeakerVolume(0)
    setDefaultSpeakerMute(true)
    return
  }

  setDefaultSpeakerVolume(spk.volume)
  setDefaultSpeakerMute(spk.mute)
  lastSpeakerHandlers.push(spk.connect("notify::volume", () => setDefaultSpeakerVolume(spk.volume)))
  lastSpeakerHandlers.push(spk.connect("notify::mute", () => setDefaultSpeakerMute(spk.mute)))
}

let lastMic: Wp.Endpoint | null = null
let lastMicHandlers: number[] = []

function trackDefaultMic(mic: Wp.Endpoint | null) {
  if (lastMic) for (const id of lastMicHandlers) lastMic.disconnect(id)
  lastMicHandlers = []
  lastMic = mic

  if (!mic) {
    setDefaultMicVolume(0)
    setDefaultMicMute(true)
    return
  }

  setDefaultMicVolume(mic.volume)
  setDefaultMicMute(mic.mute)
  lastMicHandlers.push(mic.connect("notify::volume", () => setDefaultMicVolume(mic.volume)))
  lastMicHandlers.push(mic.connect("notify::mute", () => setDefaultMicMute(mic.mute)))
}

trackDefaultSpeaker(audio.get_default_speaker())
trackDefaultMic(audio.get_default_microphone())
audio.connect("notify::default-speaker", () => trackDefaultSpeaker(audio.get_default_speaker()))
audio.connect("notify::default-microphone", () => trackDefaultMic(audio.get_default_microphone()))

export function setSpeakerVolume(v: number) {
  if (lastSpeaker) lastSpeaker.volume = Math.max(0, Math.min(1, v))
}

export function toggleSpeakerMute() {
  if (lastSpeaker) lastSpeaker.mute = !lastSpeaker.mute
}

export function setMicVolume(v: number) {
  if (lastMic) lastMic.volume = Math.max(0, Math.min(1, v))
}

export function toggleMicMute() {
  if (lastMic) lastMic.mute = !lastMic.mute
}

export function setDefaultDevice(endpoint: Wp.Endpoint) {
  endpoint.set_is_default(true)
}
