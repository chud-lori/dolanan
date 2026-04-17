// Hub — renders the catalog, handles install prompt + language toggle.

import { GAMES } from "./games.js";
import { t, getLang, setLang, applyI18n } from "./shared/i18n.js";
import { mountThemeButton } from "./shared/theme.js";
import { mountMuteButton } from "./shared/fx.js";
import { registerServiceWorker } from "./shared/sw-register.js";

const grid = document.getElementById("game-grid");
const langSeg = document.getElementById("lang-seg");
const installBtn = document.getElementById("install-btn");

function renderGrid() {
  const lang = getLang();
  grid.innerHTML = GAMES.map((g) => {
    const name = g.name[lang] || g.name.en;
    const blurb = g.blurb[lang] || g.blurb.en;
    const playersLabel = t("players.count", { n: g.players });
    return `
      <a class="game-tile" href="/games/${g.slug}/" aria-label="${name}">
        <img class="tile-icon" src="${g.icon}" alt="" width="64" height="64" loading="lazy" decoding="async" />
        <span class="tile-name">${name}</span>
        <span class="tile-meta">${playersLabel}</span>
        <span class="tile-blurb">${blurb}</span>
      </a>`;
  }).join("");
}

function renderLang() {
  langSeg.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.lang === getLang());
    b.setAttribute("aria-pressed", b.dataset.lang === getLang());
  });
  applyI18n();
}

langSeg.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => setLang(btn.dataset.lang));
});

document.addEventListener("langchange", () => {
  renderGrid();
  renderLang();
});

renderLang();
renderGrid();

// Settings controls — only live on the hub; games read stored state.
const controlsEl = document.querySelector(".hub-controls");
mountThemeButton(controlsEl);
mountMuteButton(controlsEl);

// ---- Install prompt ----
// Two paths:
//   • Chrome / Edge / Android → `beforeinstallprompt` gives us a real prompt.
//   • iOS Safari → no API exists; show a small overlay explaining Share →
//     Add to Home Screen. Hide if already running standalone.

const isStandalone =
  window.matchMedia?.("(display-mode: standalone)").matches ||
  navigator.standalone === true; // iOS-specific flag

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

// On iOS the event never fires — show the button anyway (unless already
// installed), and the click handler will explain the manual flow.
if (isIOS && !isStandalone) installBtn.hidden = false;

installBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
    return;
  }
  if (isIOS) {
    showIOSInstallHelp();
    return;
  }
  // Any other browser without a prompt — short-circuit quietly.
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
});

function showIOSInstallHelp() {
  const root = document.createElement("div");
  root.className = "modal-backdrop";
  root.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" style="max-width: 360px;">
      <div style="font-size: 48px; line-height: 1; margin-bottom: 8px;">📲</div>
      <h2 data-i18n="hub.iosInstallTitle">Add to Home Screen</h2>
      <ol style="text-align: left; padding-left: 20px; line-height: 1.6;">
        <li data-i18n="hub.iosStep1">Tap the Share button
          <span style="display:inline-block; vertical-align:-4px; font-size:18px;">⬆︎</span>
          at the bottom of Safari.</li>
        <li data-i18n="hub.iosStep2">Scroll and choose <strong>Add to Home Screen</strong>.</li>
        <li data-i18n="hub.iosStep3">Tap <strong>Add</strong> — Dolanan opens like a native app.</li>
      </ol>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary" data-i18n="btn.close">Close</button>
      </div>
    </div>`;
  document.body.appendChild(root);
  applyI18n(root);
  const close = () => root.remove();
  root.querySelector("button").addEventListener("click", close);
  root.addEventListener("click", (e) => { if (e.target === root) close(); });
}

// Register SW + auto-update on every visit.
registerServiceWorker();
