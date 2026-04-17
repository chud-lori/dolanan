// Hub — renders the catalog, handles install prompt + language toggle.

import { GAMES } from "./games.js";
import { t, getLang, setLang, applyI18n } from "./shared/i18n.js";
import { mountThemeButton } from "./shared/theme.js";

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

// Theme toggle in the hub header controls
mountThemeButton(document.querySelector(".hub-controls"));

// ---- Install prompt (Android/Chrome) ----
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

window.addEventListener("appinstalled", () => {
  installBtn.hidden = true;
});

// ---- Service worker registration (non-blocking) ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline-first is best-effort */
    });
  });
}
