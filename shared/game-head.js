// Shared: set titles, inject language toggle + sound-mute + how-to buttons,
// engage screen wake lock. Games call `wireGameHead({...})` at the top of
// their entry point and get all of this for free.

import { t, getLang, setLang, applyI18n } from "./i18n.js";
import { mountMuteButton } from "./fx.js";
import { mountHowToButton, setRules } from "./how-to.js";
import { mountThemeButton } from "./theme.js";
import { engage as engageWakeLock } from "./wake-lock.js";

/**
 * @param {object} opts
 * @param {string} opts.titleEn
 * @param {string} opts.titleId
 * @param {string} [opts.subtitleKey]
 * @param {{en: string, id: string}} [opts.rules]  — how-to content
 */
export function wireGameHead({ titleEn, titleId, subtitleKey, rules } = {}) {
  document.body.classList.add("game");
  engageWakeLock();

  const backLink = document.querySelector(".back-link");
  const titleEl = document.querySelector(".game-title");
  const subtitleEl = document.querySelector(".game-subtitle");
  const header = document.querySelector(".game-header");

  // Collect the language seg + fx-mute + how-to into a single cluster so
  // they wrap sensibly on narrow phones.
  let tools = document.querySelector(".game-head-tools");
  if (!tools && header) {
    tools = document.createElement("div");
    tools.className = "game-head-tools";
    header.appendChild(tools);
  }

  // Segmented language toggle
  let seg = document.getElementById("lang-seg");
  if (!seg && tools) {
    seg = document.createElement("div");
    seg.id = "lang-seg";
    seg.className = "lang-seg";
    seg.setAttribute("role", "tablist");
    seg.setAttribute("aria-label", "Language");
    seg.innerHTML = `
      <button type="button" data-lang="en">EN</button>
      <button type="button" data-lang="id">ID</button>`;
    tools.appendChild(seg);
    seg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => setLang(btn.dataset.lang));
    });
  }

  // Mute + theme + how-to buttons
  mountMuteButton(tools);
  mountThemeButton(tools);
  if (rules) {
    setRules(rules);
    mountHowToButton(tools);
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
