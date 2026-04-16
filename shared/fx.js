// Lightweight sound + haptics. All sounds synthesized via Web Audio so
// there are no .ogg files to ship. Haptics via navigator.vibrate.
//
// Usage from a game:
//   import { fx } from "/shared/fx.js";
//   fx.play("click");     // button / piece place
//   fx.play("roll");      // dice roll
//   fx.play("win");       // game won
//   fx.play("lose");      // game lost / captured
//   fx.haptic("tap");     // short pulse
//   fx.haptic("win");     // celebratory pattern
//
// The mute toggle is rendered by mountMuteButton() in the game header and
// persists across all games via localStorage.

import { storage } from "./storage.js";

const MUTED_KEY = "fx:muted";
let muted = storage.get(MUTED_KEY, false);

// Lazily create the AudioContext — iOS requires user-gesture before it'll
// unlock audio. We'll initialize on the first `play()` call.
let ctx = null;
function audio() {
  if (!ctx && typeof window !== "undefined" && "AudioContext" in window) {
    try { ctx = new AudioContext(); } catch { /* no audio */ }
  }
  // iOS sometimes leaves the context suspended after backgrounding.
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// --- Synthesis helpers ------------------------------------------------------

function beep(freq, dur, type = "sine", gain = 0.08) {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(gain, a.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  osc.connect(g).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + dur + 0.02);
}

function noise(dur, gain = 0.05) {
  const a = audio();
  if (!a) return;
  const bufferSize = Math.floor(a.sampleRate * dur);
  const buffer = a.createBuffer(1, bufferSize, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Decaying noise — sounds like a dice roll
    const decay = 1 - i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const src = a.createBufferSource();
  src.buffer = buffer;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(g).connect(a.destination);
  src.start();
}

function chord(freqs, dur, delay = 0, gain = 0.06) {
  for (const f of freqs) setTimeout(() => beep(f, dur, "triangle", gain), delay);
}

// --- Sound library ---------------------------------------------------------

const SOUNDS = {
  click: () => beep(440, 0.05, "square", 0.05),
  place: () => { beep(260, 0.04, "triangle", 0.06); setTimeout(() => beep(200, 0.06, "sine", 0.04), 40); },
  roll:  () => { noise(0.28, 0.06); setTimeout(() => beep(520, 0.08, "triangle", 0.05), 280); },
  win:   () => { chord([523, 659, 784], 0.24, 0, 0.06); setTimeout(() => chord([659, 784, 988], 0.28), 150); },
  lose:  () => { beep(320, 0.2, "sawtooth", 0.05); setTimeout(() => beep(220, 0.3, "sawtooth", 0.05), 180); },
  capture: () => { beep(180, 0.06, "square", 0.06); setTimeout(() => beep(130, 0.1, "square", 0.05), 60); },
};

// --- Haptics ---------------------------------------------------------------

const HAPTICS = {
  tap: 18,
  click: 12,
  win: [60, 40, 60, 40, 120],
  lose: [200, 80, 200],
  capture: [40, 30, 40],
  roll: [10, 30, 10, 30, 20],
};

// --- Public API ------------------------------------------------------------

export const fx = {
  isMuted() { return muted; },

  setMuted(v) {
    muted = !!v;
    storage.set(MUTED_KEY, muted);
    document.dispatchEvent(new CustomEvent("fx:mute", { detail: muted }));
  },

  toggle() { this.setMuted(!muted); },

  play(name) {
    if (muted) return;
    const fn = SOUNDS[name];
    if (fn) fn();
  },

  haptic(name) {
    if (muted) return;
    if (!("vibrate" in navigator)) return;
    const p = HAPTICS[name];
    if (p != null) navigator.vibrate(p);
  },
};

/**
 * Inject a sound-mute toggle button into a container. Returns the button
 * element so callers can re-style / reposition. Pass the game header.
 */
export function mountMuteButton(container) {
  if (!container) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-secondary fx-mute";
  btn.setAttribute("aria-label", "Toggle sound");
  const render = () => {
    btn.textContent = muted ? "🔇" : "🔊";
    btn.setAttribute("aria-pressed", String(muted));
  };
  btn.addEventListener("click", () => {
    fx.toggle();
    // Any tap is a user gesture — unlock the AudioContext for iOS Safari.
    audio();
    if (!muted) fx.play("click");
  });
  document.addEventListener("fx:mute", render);
  container.appendChild(btn);
  render();
  return btn;
}
