// Service-worker registration with auto-update + manual fallback.
// Imported by hub.js and shared/game-head.js so every page participates.
//
// Strategy:
//   1. Register /sw.js with `updateViaCache: 'none'` so the browser never
//      HTTP-caches the sw.js itself — every update check fetches it fresh
//      regardless of CDN/edge cache headers.
//   2. Force reg.update() on load AND on visibility change — browsers only
//      auto-check every ~24h otherwise, which is too slow for a fresh deploy.
//   3. When a new SW enters "installed" state, ping it with SKIP_WAITING.
//   4. When that new SW takes control (`controllerchange`), reload the page
//      once. The user sees "loading" for a blink and is now on the new build.
//   5. Fallback: if a new SW is waiting and auto-reload hasn't fired within
//      a few seconds (mobile browsers sometimes defer/terminate SW work),
//      show a small "Update available — tap to reload" toast so the user
//      can force the update themselves without clearing cache.

let wired = false;

export function registerServiceWorker() {
  if (wired) return;
  wired = true;
  if (!("serviceWorker" in navigator)) return;

  // `controllerchange` fires in two cases:
  //   (a) A brand-new page with no prior controller gets one for the first
  //       time (initial install / first load after cache miss). We do NOT
  //       want to reload here — the page is already showing fresh content.
  //   (b) An existing controlled page gets a NEW version taking over. This
  //       is the real "new deploy" case and we DO want to reload.
  // We distinguish them by snapshotting `navigator.serviceWorker.controller`
  // at registration time. If it was non-null and a changeover fires, we're
  // in case (b).
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    if (!hadController) return; // first-time control — don't reload
    reloading = true;
    location.reload();
  });

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });
      reg.update().catch(() => {});

      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          reg.update().catch(() => {});
        }
      });

      const nudgeWaiting = () => {
        if (!reg.waiting) return;
        reg.waiting.postMessage("SKIP_WAITING");
        // If the auto-reload doesn't fire (mobile SW lifecycle quirks,
        // intermittent controllerchange on iOS, etc.), show a manual
        // fallback after a short grace period. If the auto path works,
        // the page reloads before the toast ever appears.
        scheduleUpdateToast(reg);
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

let toastScheduled = false;
function scheduleUpdateToast(reg) {
  if (toastScheduled) return;
  toastScheduled = true;
  setTimeout(() => {
    // Auto-reload already happened → this module is gone; not reachable.
    // If it didn't, surface the prompt so the user can unstick themselves.
    if (!reg.waiting && !navigator.serviceWorker.controller) return;
    showUpdateToast(() => {
      try { reg.waiting?.postMessage("SKIP_WAITING"); } catch {}
      // Belt-and-suspenders: if controllerchange still doesn't fire, just
      // reload directly. The new SW will claim on the next load anyway.
      setTimeout(() => location.reload(), 500);
    });
  }, 3000);
}

function showUpdateToast(onTap) {
  if (document.getElementById("dolanan-update-toast")) return;
  const el = document.createElement("button");
  el.id = "dolanan-update-toast";
  el.type = "button";
  el.textContent = "Update available — tap to reload";
  el.setAttribute("role", "alert");
  el.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:max(16px, env(safe-area-inset-bottom, 16px))",
    "transform:translateX(-50%)",
    "z-index:2147483647",
    "background:#0f172a",
    "color:#fff",
    "border:1px solid rgba(255,255,255,0.18)",
    "border-radius:999px",
    "padding:10px 18px",
    "font:500 14px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
    "box-shadow:0 8px 24px rgba(0,0,0,0.35)",
    "cursor:pointer",
    "max-width:92vw",
  ].join(";");
  el.addEventListener("click", () => {
    el.textContent = "Updating…";
    el.disabled = true;
    onTap();
  }, { once: true });
  document.body.appendChild(el);
}
