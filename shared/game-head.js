// Shared: set game title, wire how-to button, engage wake lock.
// Settings (language, sound, theme) are ONLY controlled from the hub.
// Games just read their stored state — no duplicate toggle buttons.

import { t, getLang, applyI18n } from "./i18n.js";
import { mountHowToButton, setRules } from "./how-to.js";
import { engage as engageWakeLock } from "./wake-lock.js";
// Import theme + fx so they apply their stored state on page load.
import "./theme.js";
import "./fx.js";

/**
 * @param {object} opts
 * @param {string} opts.titleEn
 * @param {string} opts.titleId
 * @param {string} [opts.subtitleKey]
 * @param {{en: string, id: string}} [opts.rules] — how-to content
 */
export function wireGameHead({ titleEn, titleId, subtitleKey, rules } = {}) {
  document.body.classList.add("game");
  engageWakeLock();

  const backLink = document.querySelector(".back-link");
  const titleEl = document.querySelector(".game-title");
  const subtitleEl = document.querySelector(".game-subtitle");
  const header = document.querySelector(".game-header");

  // Only inject how-to ("?") button — it's game-specific.
  if (rules && header) {
    let tools = document.querySelector(".game-head-tools");
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "game-head-tools";
      header.appendChild(tools);
    }
    setRules(rules);
    mountHowToButton(tools);
  }

  function refresh() {
    if (titleEl) titleEl.textContent = getLang() === "id" ? titleId : titleEn;
    if (subtitleEl && subtitleKey) subtitleEl.textContent = t(subtitleKey);
    if (backLink) backLink.textContent = t("nav.back");
    applyI18n();
  }

  document.addEventListener("langchange", refresh);
  refresh();
}
