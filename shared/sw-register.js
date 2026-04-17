// Service-worker registration with auto-update.
// Imported by hub.js and shared/game-head.js so every page participates.
//
// Strategy:
//   1. Register /sw.js on load.
//   2. Force reg.update() on load AND on visibility change — browsers only
//      auto-check every ~24h otherwise, which is too slow for a fresh deploy.
//   3. When a new SW enters "installed" state, ping it with SKIP_WAITING.
//   4. When that new SW takes control (`controllerchange`), reload the page
//      once. The user sees "loading" for a blink and is now on the new build.
//
// End user never needs to hard-refresh — a normal visit picks up the update.

let wired = false;

export function registerServiceWorker() {
  if (wired) return;
  wired = true;
  if (!("serviceWorker" in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      reg.update().catch(() => {});

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });

      const nudgeWaiting = () => {
        if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
      };
      nudgeWaiting();
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nudgeWaiting();
          }
        });
      });
    } catch {
      /* offline-first is best-effort */
    }
  });
}
