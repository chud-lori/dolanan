// Keep the screen on while a game is open. Phones going to sleep mid-Chess
// or mid-Werewolf-night is the top QoL complaint. The Wake Lock API is
// well-supported on Chrome/Edge/Safari 16.4+; on older browsers this is a
// silent no-op.
//
// Usage: call `engage()` from the game-head wiring; no manual release needed.
// The lock is automatically re-acquired when the page becomes visible again
// (iOS/Android drop the lock on backgrounding).

let lock = null;

async function acquire() {
  if (!("wakeLock" in navigator)) return;
  if (document.visibilityState !== "visible") return;
  try {
    lock = await navigator.wakeLock.request("screen");
    lock.addEventListener("release", () => { lock = null; });
  } catch {
    /* user may have denied or battery saver may block — best-effort */
  }
}

export function engage() {
  if (lock) return;
  acquire();
  if (!document.__dolananWakeWired) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && !lock) acquire();
    });
    document.__dolananWakeWired = true;
  }
}
