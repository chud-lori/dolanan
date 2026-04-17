// Shared: set game title, wire how-to button, engage wake lock.
// Settings (language, sound, theme) are ONLY controlled from the hub.
// Games just read their stored state — no duplicate toggle buttons.

import { t, applyI18n, pickLocalized } from "./i18n.js";
import { mountHowToButton, setRules } from "./how-to.js";
import { engage as engageWakeLock } from "./wake-lock.js";
import { registerServiceWorker } from "./sw-register.js";
// Import theme + fx so they apply their stored state on page load.
import "./theme.js";
import "./fx.js";

// Every game page also auto-checks for SW updates — so a deploy reaches
// users the next time they open ANY page, not just the hub.
registerServiceWorker();

/**
 * @param {object} opts
 * @param {string} opts.titleEn
 * @param {string} opts.titleId
 * @param {string} [opts.titleJw]
 * @param {string} [opts.subtitleKey]
 * @param {{en: string, id: string, jw?: string}} [opts.rules] — how-to content
 */
export function wireGameHead({ titleEn, titleId, titleJw, subtitleKey, rules } = {}) {
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
    if (titleEl) {
      titleEl.textContent = pickLocalized({ en: titleEn, id: titleId, jw: titleJw });
    }
    if (subtitleEl && subtitleKey) subtitleEl.textContent = t(subtitleKey);
    if (backLink) backLink.textContent = t("nav.back");
    applyI18n();
  }

  document.addEventListener("langchange", refresh);
  refresh();
}
