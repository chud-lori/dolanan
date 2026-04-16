// Shared "How to play" modal. Games register rule text (EN + ID) and this
// module injects a "?" button into the game header that opens a centered
// modal on tap. No dependency besides i18n.

import { t, getLang } from "./i18n.js";

let current = null; // { en, id }
let modal = null;
let titleLabel = { en: "How to play", id: "Cara main" };

/** Register the game's rules (HTML strings) and optional button label. */
export function setRules({ en, id }, labels = {}) {
  current = { en, id };
  if (labels.en || labels.id) titleLabel = { ...titleLabel, ...labels };
}

export function mountHowToButton(container) {
  if (!container) return null;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-secondary howto-btn";
  btn.textContent = "?";
  btn.setAttribute("aria-label",
    getLang() === "id" ? titleLabel.id : titleLabel.en);
  btn.addEventListener("click", open);
  container.appendChild(btn);
  document.addEventListener("langchange", () => {
    btn.setAttribute("aria-label",
      getLang() === "id" ? titleLabel.id : titleLabel.en);
  });
  return btn;
}

function open() {
  if (!current) return;
  close(); // just in case
  modal = document.createElement("div");
  modal.className = "modal-backdrop howto-modal";
  const body = getLang() === "id" ? current.id : current.en;
  const heading = getLang() === "id" ? titleLabel.id : titleLabel.en;
  const closeLabel = t("btn.close");
  modal.innerHTML = `
    <div class="modal howto-card" role="dialog" aria-modal="true">
      <h2>${heading}</h2>
      <div class="howto-body">${body || ""}</div>
      <div class="modal-actions">
        <button type="button" class="btn btn-primary" data-close>${closeLabel}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const btn = modal.querySelector("[data-close]");
  btn.focus();
  btn.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  document.addEventListener("keydown", escClose);
}

function escClose(e) {
  if (e.key === "Escape") close();
}

function close() {
  if (modal) modal.remove();
  modal = null;
  document.removeEventListener("keydown", escClose);
}
