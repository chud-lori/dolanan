// Shared: set titles, wire a segmented language toggle into every game page,
// and keep the UI in sync with the current language.

import { t, getLang, setLang, applyI18n } from "./i18n.js";

/**
 * @param {object} opts
 * @param {string} opts.titleEn - Game title in English
 * @param {string} opts.titleId - Game title in Indonesian
 * @param {string} [opts.subtitleKey] - i18n key for subtitle (with scope)
 */
export function wireGameHead({ titleEn, titleId, subtitleKey } = {}) {
  document.body.classList.add("game");

  const backLink = document.querySelector(".back-link");
  const titleEl = document.querySelector(".game-title");
  const subtitleEl = document.querySelector(".game-subtitle");
  const header = document.querySelector(".game-header");

  // Inject segmented language toggle if missing.
  let seg = document.getElementById("lang-seg");
  if (!seg && header) {
    seg = document.createElement("div");
    seg.id = "lang-seg";
    seg.className = "lang-seg";
    seg.setAttribute("role", "tablist");
    seg.setAttribute("aria-label", "Language");
    seg.innerHTML = `
      <button type="button" data-lang="en">EN</button>
      <button type="button" data-lang="id">ID</button>
    `;
    header.appendChild(seg);
    seg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
  }

  function refresh() {
    if (titleEl) titleEl.textContent = getLang() === "id" ? titleId : titleEn;
    if (subtitleEl && subtitleKey) subtitleEl.textContent = t(subtitleKey);
    if (backLink) backLink.textContent = t("nav.back");
    if (seg) {
      seg.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("active", b.dataset.lang === getLang());
        b.setAttribute("aria-pressed", b.dataset.lang === getLang());
      });
    }
    applyI18n();
  }

  document.addEventListener("langchange", refresh);
  refresh();
}
